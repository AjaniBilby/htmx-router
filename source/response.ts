export function text(text: string, init?: ResponseInit) {
	init ||= {};
	init.statusText ||= "ok";
	init.status ||= 200;

	const res = new Response(text, init);
	res.headers.set("Content-Type", "text/plain");
	res.headers.set("X-Caught", "true");

	return res;
}

export function html(text: string, init?: ResponseInit) {
	init ||= {};
	init.statusText ||= "ok";
	init.status ||= 200;

	const res = new Response(text, init);
	res.headers.set("Content-Type", "text/html; charset=UTF-8");
	res.headers.set("X-Caught", "true");

	return res;
}

export type TypedResponse<T> = Omit<Response, "json"> & { json(): Promise<T> };
export type TypedJson<U extends TypedResponse<any>> = U extends TypedResponse<infer T> ? T : never;
export function json<T>(data: T, init?: ResponseInit): TypedResponse<T> {
	init ||= {};
	init.statusText ||= "ok";
	init.status ||= 200;

	const res = new Response(JSON.stringify(data), init);
	res.headers.set("Content-Type", "application/json");
	res.headers.set("X-Caught", "true");

	return res;
}

export function redirect(url: string, init?: ResponseInit & { clientOnly?: boolean }) {
	init ||= {};
	init.statusText ||= "Temporary Redirect";
	init.status ||= 307;

	const res = new Response("", init);
	if (!init?.clientOnly) res.headers.set("Location", url);
	res.headers.set("HX-Location", url); // use hx-boost if applicable

	return res;
}

export function revalidate(init?: ResponseInit) {
	init ||= {};
	init.statusText ||= "ok";
	init.status ||= 200;

	const res = new Response("", init);
	res.headers.set("HX-Location", "");

	return res;
}

export function refresh(init?: ResponseInit & { clientOnly?: boolean }) {
	init ||= {};
	init.statusText ||= "ok";
	init.status ||= 200;

	const res = new Response("", init);
	if (!init?.clientOnly) res.headers.set("Refresh", "0"); // fallback
	res.headers.set("HX-Refresh", "true");

	return res;
}