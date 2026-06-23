import * as etag from "./etag";
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
	res.headers.set("HX-Push-Url", "false");
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
 * @deprecated import from `htmx-router/etag` instead
 */
export const AssertETagStale = etag.AssertETagStale;


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