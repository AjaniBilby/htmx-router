import type { IncomingMessage, ServerResponse } from "http";
import type { ViteDevServer } from "vite";

import { GenericContext, RouteTree } from "~/router.js";
import { Resolve } from "~/request/native.js";

type Config = {
	build: Promise<any> | (() => Promise<Record<string, any>>),
	viteDevServer: ViteDevServer | null,
	render: GenericContext["render"]
};

type RouterModule = { tree: RouteTree }

export function createRequestHandler(config: Config) {
	return async (req: IncomingMessage, res: ServerResponse) => {
		try {
			const mod: RouterModule = typeof config.build === "function" ? await config.build() : await config.build;

			const request = NativeRequest(req);
			let { response, headers } = await Resolve(request, mod.tree, config);
			res.writeHead(response.status, headers);

			if (!response.body || typeof response.body.getReader !== 'function') {
				const rendered = await response.text();
				res.end(rendered);
				return;
			}

			const reader = response.body.getReader();
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				res.write(value); // `value` is a Uint8Array.
			}

			res.end();
		} catch (e) {
			res.statusCode = 500;
			if (e instanceof Error) {
				console.error(e.stack);
				config.viteDevServer?.ssrFixStacktrace(e);
				res.end(e.stack);
			} else {
				console.error(e);
				res.end(String(e));
			}
		}
	}
}

function NativeRequest(req: IncomingMessage & { originalUrl?: string }) {
	const ctrl = new AbortController();
	const headers = new Headers(req.headers as any);
	const url = new URL(`http://${headers.get('host')}${req.originalUrl || req.url}`);

	req.once('aborted', () => ctrl.abort());

	const bodied = req.method !== "GET" && req.method !== "HEAD";
	const request = new Request(url, {
		headers,
		method: req.method,
		body: bodied ? req : undefined as any,
		signal: ctrl.signal,
		referrer: headers.get("referrer") || undefined,
		// @ts-ignore
		duplex: bodied ? 'half' : undefined
	});

	if (!request.headers.has("X-Real-IP")) {
		const info = req.socket.address();
		if ("address" in info) request.headers.set("X-Real-IP", info.address);
	}

	return request;
}