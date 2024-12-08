import type * as http from "http";

import { RouteContext, RouteTree } from '~/router';

export async function HttpResolutionHelper(req: http.IncomingMessage & { originalUrl?: string }, tree: RouteTree, renderer: RouteContext["render"]) {
	const ctrl = new AbortController();
	const headers = new Headers(req.headers as any);
	const url = new URL(`http://${headers.get('host')}${req.originalUrl || req.url}`);

	req.once('aborted', () => ctrl.abort())

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

	return await RenderRoute(request, url, tree, renderer);
}

export async function RenderRoute(request: Request, url: URL, tree: RouteTree, renderer: RouteContext["render"]): Promise<{ response: Response, headers: Record<string, string>}> {
	const x = url.pathname.endsWith("/") ? url.pathname.slice(0, -1) : url.pathname;
	const fragments = x.split("/").slice(1);

	const ctx = new RouteContext(request, url, renderer);

	let response = await tree.resolve(fragments, ctx);
	if (response === null) response = new Response("Not Found", { status: 404, statusText: "Not Found" });

	// Merge context headers
	response.headers.forEach((val, key) => {
		ctx.headers.set(key, val);
	});

	// Merge cookie changes
	const headers = Object.fromEntries(ctx.headers as any);
	const cookies = ctx.cookie.export();
	if (cookies.length > 0) headers['set-cookie'] = cookies;
	return { response, headers };
}