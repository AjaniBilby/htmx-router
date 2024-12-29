import { ServerOnlyWarning } from "./internal/util.js";
ServerOnlyWarning("dynamic-ref");

import type { GenericContext } from "./router.js";
import { QuickHash } from "./internal/util.js";

const registry = new Map<string, Loader<unknown>>();
const index = new Map<Function, string>();

function Register<T>(load: Loader<T>) {
	const existing = index.get(load);
	if (existing) return existing;

	const hash = QuickHash(String(load));
	const name = `${encodeURIComponent(load.name)}-${hash}`;
	registry.set(name, load as Loader<unknown>);

	const url = `/_/dynamic/${name}`;
	index.set(load, url);

	return url;
}

type Loader<T> = (ctx: GenericContext, params: T) => Promise<JSX.Element | Response>;
export function DynamicReference<T extends Record<string, string>>(loader: Loader<T>, params?: T) {
	let url = Register(loader);

	if (params) {
		const query = new URLSearchParams();
		if (params) for (const key in params) query.set(key, params[key]);

		url += "?" + query.toString();
	}

	return url;
}


export async function _resolve(fragments: string[], ctx: GenericContext) {
	if (!fragments[2]) return null;

	const endpoint = registry.get(fragments[2]);
	if (!endpoint) return null;

	const props: Record<string, string> = {};
	for (const [key, value] of ctx.url.searchParams) props[key] = value;

	ctx.headers.set("X-Partial", "true");
	const res = await endpoint(ctx, props);

	if (res instanceof Response) return res;
	return ctx.render(res);
}