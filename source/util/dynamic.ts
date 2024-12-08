import { RouteContext } from "~/router.js";
import { QuickHash } from "~/util/hash.js";

const registry = new Map<string, Loader<unknown>>();
const index = new Map<Function, string>();

export function RegisterDynamic<T>(load: Loader<T>) {
	const existing = index.get(load);
	if (existing) return existing;

	const hash = QuickHash(String(load));
	const name = `${encodeURIComponent(load.name)}-${hash}`;
	registry.set(name, load as Loader<unknown>);

	const url = `/_/dynamic/${name}?`;
	index.set(load, url);

	return url;
}

type Loader<T> = (params: T, ctx: RouteContext) => Promise<JSX.Element>;

export async function _resolve(fragments: string[], ctx: RouteContext) {
	if (!fragments[2]) return null;

	const endpoint = registry.get(fragments[2]);
	if (!endpoint) return null;

	const props: Record<string, string> = {};
	for (const [key, value] of ctx.url.searchParams) props[key] = value;

	ctx.headers.set("X-Partial", "true");
	return ctx.render(await endpoint(props, ctx));
}