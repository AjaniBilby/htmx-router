export function text(text: BodyInit, init?: ResponseInit) {
	init = FillResponseInit(200, "Ok", init);

	const res = new Response(text, init);
	res.headers.set("Content-Type", "text/plain");
	res.headers.set("X-Caught", "true");

	return res;
}

export function html(text: BodyInit, init?: ResponseInit) {
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

export function redirect(url: string, init?: ResponseInit & { clientOnly?: boolean }) {
	init = FillResponseInit(307, "Temporary Redirect", init);

	const res = new Response("", init);
	if (!init?.clientOnly) res.headers.set("Location", url);
	res.headers.set("HX-Location", url); // use hx-boost if applicable
	res.headers.set("X-Caught", "true");

	return res;
}

export function revalidate(init?: ResponseInit) {
	init = FillResponseInit(200, "Ok", init);

	const res = new Response("", init);
	res.headers.set("HX-Location", "");
	res.headers.set("HX-Replace-Url", "");
	res.headers.set("X-Caught", "true");

	return res;
}

export function refresh(init?: ResponseInit & { clientOnly?: boolean }) {
	init = FillResponseInit(200, "Ok", init);

	const res = new Response("", init);
	if (!init?.clientOnly) res.headers.set("Refresh", "0"); // fallback
	res.headers.set("HX-Refresh", "true");
	res.headers.set("X-Caught", "true");

	return res;
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