import type { IncomingMessage, ServerResponse } from "node:http";

import type { HtmxRouterServer } from "../server.js";

export function NodeAdaptor(server: HtmxRouterServer, resolve404: boolean) {
	return async (req: IncomingMessage, res: ServerResponse) => {
		const request = CreateRequest(req);
		const response = await server.resolve(request, resolve404);
		if (response === null) return;

		ConsumeResponse(res, response);
	}
}

function CreateRequest(req: IncomingMessage & { originalUrl?: string }) {
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


async function ConsumeResponse(into: ServerResponse, response: Response) {
	const headers: { [key: string]: string | string[] } = Object.fromEntries(response.headers as any);

	{ // handle multi-cookie setting
		const cookies = response.headers.getSetCookie();
		if (cookies.length > 0) headers["set-cookie"] = cookies;
	}

	into.writeHead(response.status, headers);
	if (response.body instanceof ReadableStream) {
		const reader = response.body.getReader();
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			into.write(value);
		}

		into.end();
	} else {
		const rendered = await response.text();
		into.end(rendered);
	}
}