import { ResponseInit } from "./util/types";


export function text(text: BodyInit, init?: ResponseInit): Response {
	init = FillResponseInit(200, "Ok", init);

	const res = new Response(text, init);
	res.headers.set("Content-Type", "text/plain");
	res.headers.set("X-Caught", "true");

	return res;
}

export function html(text: BodyInit, init?: ResponseInit): Response {
	init = FillResponseInit(200, "Ok", init);

	const res = new Response(text, init);
	res.headers.set("Content-Type", "text/html; charset=UTF-8");
	res.headers.set("X-Caught", "true");

	return res;
}

export type TypedResponse<T> = Omit<Response, "json"> & { json(): Promise<T> };
export type TypedJson<U extends TypedResponse<any>> = U extends TypedResponse<infer T> ? T : never;
export function json<T>(data: T, init?: ResponseInit): TypedResponse<T> {
	init = FillResponseInit(200, "Ok", init);

	const res = new Response(JSON.stringify(data), init);
	res.headers.set("Content-Type", "application/json");
	res.headers.set("X-Caught", "true");

	return res;
}

export function redirect(url: string, init?: ResponseInit & { clientOnly?: boolean, permanent?: boolean }): Response {
	if (init?.permanent) init = FillResponseInit(308, "Permanent Redirect", init);
	else init = FillResponseInit(307, "Temporary Redirect", init);

	const res = new Response(null, init);
	if (!init?.clientOnly) res.headers.set("Location", url);
	res.headers.set("HX-Location", url); // use hx-boost if applicable
	res.headers.set("X-Caught", "true");

	return res;
}

export function revalidate(init?: ResponseInit): Response {
	init = FillResponseInit(200, "Ok", init);

	const res = new Response("", init);
	res.headers.set("HX-Location", "");
	res.headers.set("HX-Replace-Url", "");
	res.headers.set("X-Caught", "true");

	return res;
}

export function refresh(init?: ResponseInit & { clientOnly?: boolean }): Response {
	init = FillResponseInit(200, "Ok", init);

	if (init.clientOnly) {
		const res = new Response(null, init);
		res.headers.set("HX-Refresh", "true");
		res.headers.set("X-Caught", "true");
		return res;
	}

	const res = new Response(`<script>if (document.referrer) location.href = document.referrer;</script>Something went wrong`);
	res.headers.set("Content-Type", "text/html; charset=UTF-8")
	res.headers.set("HX-Refresh", "true");
	res.headers.set("X-Caught", "true");

	return res;
}


/**
 * Handles Entity-Tag based conditional requests by setting cache headers and controlling execution flow.
 * Acts like an assertion that stops execution when the client's ETag matches the current ETag.
 *
 * @param {Request} request - The incoming HTTP request object
 * @param {Headers} headers - The output response headers object to modify
 * @param {string} etag - The current ETag value for the resource (do not quote)
 * @param {Object} [options] - Optional caching configuration
 * @param {number} [options.revalidate] - client must revalidate their etag at this interval in seconds
 * @param {boolean} [options.public] - cache visibility scope:
 *   - "public": Can be cached by any cache (i.e. Cloudflare)
 *   - "private": Can only be cached by private caches (i.e. browser)
 *
 * @throws {Response} `304 Not Modified` Response with the configured headers
 *   when the client's If-None-Match header matches the provided ETag
 *
 * @returns {void} if client's etag is stale, allows execution to continue to generate new result
 *
 * @example
 * // Basic usage - will return early if client has current version
 * GuardEntityTag(request, headers, "v1.2.3");
 *
 * @example
 * // With caching options
 * GuardEntityTag(request, headers, "v1.2.3", {
 *   revalidate: 3600,
 *   scope: "public"
 * });
 *
 * @example
 * // Usage in a handler function
 * function handleRequest(request, headers) {
 *   const currentEtag = generateEtag(data);
 *
 *   // Will throw 304 if client ETag is fresh
 *   GuardEntityTag(request, headers, currentEtag);
 *
 *   // This code only runs if client needs updated content
 *   return new Response(generateContent(), { headers });
 * }
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/ETag | ETag - MDN Web Docs }
 */
export function AssertETagStale(request: Request, headers: Headers, etag: string, options?: { revalidate?: number, public?: boolean }): void {
	headers.delete("Cache-Control"); // clear any defaults

	if (options) {
		// default to private, because it's the slightly less worse of the two potential foot guns
		if (options.public) headers.append("Cache-Control", "public");
		else headers.append("Cache-Control", "private");

		if (options.revalidate !== undefined) headers.append("Cache-Control", `max-age=${options.revalidate}`);
	}
	headers.append("Cache-Control", "must-revalidate");

	etag = encodeURIComponent(etag.trim()); // safely handle any special characters
	headers.set("ETag", `"${etag}"`);

	const rules = request.headers.get("if-none-match");
	if (!rules || !MatchEtags(rules.trim(), etag)) return;

	const res = new Response(null, { headers, status: 304, statusText: "Not Modified" });
	res.headers.set("X-Caught", "true");

	throw res;
}

function MatchEtags(header: string, etag: string): boolean {
	if (header === "*") return true;

	for (const term of header.split(/,\s*/)) {
		let s = term.startsWith('W/') ? 'W/'.length : 0;
		let e = term.endsWith('"') ? term.length-1 : term.length;
		if (term.startsWith('"', s)) s++;

		const tag = term.slice(s, e);
		if (etag === tag) return true;
	}

	return false;
}


/**
 * This is to fix issues with deno
 * When you try and change the statusText on a Response object
 */
function FillResponseInit(status: number, statusText: string, init: ResponseInit | undefined) {
	if (init === undefined) init = {};
	if (init.statusText === undefined) init.statusText = statusText;
	if (init.status === undefined)     init.status = status;

	return init;
}