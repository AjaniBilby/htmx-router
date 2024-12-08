import type { ViteDevServer } from "vite";
import { IncomingMessage, ServerResponse } from "http";

import { RouteContext, RouteTree } from "~/router.js";
import { Resolve } from "~/request/native.js";

type Config = {
	build: Promise<any> | (() => Promise<Record<string, any>>),
	viteDevServer: ViteDevServer | null,
	render: RouteContext["render"]
};

type RouterModule = { tree: RouteTree }

export function createRequestHandler(config: Config) {
	return async (req: IncomingMessage, res: ServerResponse) => {
		try {
			const mod: RouterModule = typeof config.build === "function" ? await config.build() : await config.build;

			const request = NativeRequest(req);
			let { response, headers } = await Resolve(request, mod.tree, config);
			res.writeHead(response.status, headers);
			let rendered = await response.text();

			if (config.viteDevServer) {
				if (!headers["x-partial"] && response.headers.get("content-type")?.startsWith("text/html")) {
					rendered = await config.viteDevServer.transformIndexHtml(req.url || "", rendered);
				}
			}

			res.end(rendered);
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

	req.once('aborted', () => ctrl.abort())

	const bodied = req.method !== "GET" && req.method !== "HEAD";
	return new Request(url, {
		headers,
		method: req.method,
		body: bodied ? req : undefined as any,
		signal: ctrl.signal,
		referrer: headers.get("referrer") || undefined,
		// @ts-ignore
		duplex: bodied ? 'half' : undefined
	});
}