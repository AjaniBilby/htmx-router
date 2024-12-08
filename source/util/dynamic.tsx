import { RouteContext } from "~/router.js";
import { QuickHash } from "~/util/hash.js";

const registry = new Map<string, Loader<unknown>>();

type Loader<T> = (params: T, ctx: RouteContext) => Promise<JSX.Element>;
export function Dynamic<T extends Record<string, string>>(props: {
	params: T,
	load: Loader<T>
	children?: JSX.Element
}): JSX.Element {
	const hash = QuickHash(String(props.load));
	const name = `${encodeURIComponent(props.load.name)}-${hash}`;
	registry.set(name, props.load as Loader<unknown>);

	const query = new URLSearchParams();
	for (const key in props.params) query.set(key, props.params[key]);
	const request =`/_/dynamic/${name}?${query.toString()}`;

	return <div
		hx-get={request}
		hx-trigger="load"
		hx-swap="outerHTML transition:true"
		style={{ display: "contents" }}
	>{props.children ? props.children : ""}</div>
}

export async function _resolve(fragments: string[], ctx: RouteContext) {
	if (!fragments[2]) return null;

	const endpoint = registry.get(fragments[2]);
	if (!endpoint) return null;

	const props: Record<string, string> = {};
	for (const [key, value] of ctx.url.searchParams) props[key] = value;

	ctx.headers.set("X-Partial", "true");
	return ctx.render(await endpoint(props, ctx));
}