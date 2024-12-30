import { ServerOnlyWarning } from "./internal/util.js";
ServerOnlyWarning("dynamic-ref");

import { Parameterized, Parameterizer, ParameterShaper } from "./util/parameters.js";
import { RenderFunction } from "./index.js";
import { RouteContext } from "./router.js";
import { QuickHash } from "./internal/util.js";

type IndexEntry<T extends ParameterShaper> = { shape: ParameterShaper, url: string, converter?: T };

const registry = new Map<string, RenderFunction>();
const index = new Map<Function, IndexEntry<{}>>();

function MakeIdentity(func: Function) {
	const hash = QuickHash(String(func));
	const name = `${encodeURIComponent(func.name)}-${hash}`;
	const url = `/_/dynamic/${name}`;

	return { name, url };
}

export function RegisterDynamic<T extends ParameterShaper>(shape: T, func: RenderFunction<T>, converter?: Parameterizer<T>) {
	const existing = index.get(func);
	if (existing) return existing.url;

	const { url, name } = MakeIdentity(func);
	registry.set(name, func as RenderFunction);

	index.set(func, { url, shape, converter });

	return url;
}



export function DynamicReference<T extends ParameterShaper>(func: RenderFunction<T>, params?: Parameterized<T>): string {
	const entry = index.get(func);
	let url: string;
	if (!entry) {
		const identity = MakeIdentity(func);
		console.warn(`Warn: Function ${identity.name} has not registered before use`);
		url = identity.url;
	} else {
		url = entry.url;
	}

	if (!params) return url;

	const query = new URLSearchParams();
	if (entry?.converter) {
		const convert = entry.converter as Parameterizer<T>;
		for (const key in convert) {
			if (!(key in params)) throw new Error(`Missing parameter ${key}`);

			const raw = params[key];
			const str = convert[key](raw);
			query.set(key, str)
		}
	} else {
		for (const key in params) query.set(key, String(params[key]));
	}

	return url + "?" + query.toString();
}



/**
 * RouteTree mounting point
 */
export const path = "_/dynamic/$";

export const parameters = {
	"$": String
}

export async function loader(ctx: RouteContext<typeof parameters>) {
	const endpoint = registry.get(ctx.params["$"]);
	if (!endpoint) return null;

	const prelude: Record<string, string> = {};
	for (const [key, value] of ctx.url.searchParams) prelude[key] = value;

	const entry = index.get(endpoint);
	if (!entry) {
		console.warn(`Warn: Function ${endpoint.name} was not registered for dynamic use`);
		return null;
	}

	const forward = new RouteContext(ctx, prelude, entry.shape);
	const res = await endpoint(forward);

	if (res instanceof Response) return res;
	if (res === null) return null;

	ctx.headers.set("X-Partial", "true");
	return ctx.render(res);
}
export const action = loader;