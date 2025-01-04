import { ServerOnlyWarning } from "./internal/util.js";
ServerOnlyWarning("endpoint");

import type { RenderFunction, RouteContext } from "./index.js";
import { QuickHash } from "./internal/util.js";

const registry = new Map<string, Endpoint>();

/**
 * Create a route-less endpoint
 * The name is optional and will be inferred from the function if not given (helpful for network waterfalls)
 */
export class Endpoint {
	readonly render: RenderFunction<{}>;
	readonly name: string;
	readonly url:  string;

	constructor(render: RenderFunction<{}>, name?: string) {
		this.render = render;

		name ||= render.name;

		const hash = QuickHash(String(render));
		this.name = name ? `${encodeURIComponent(name)}-${hash}` : hash;
		this.url = `/_/endpoint/${this.name}`;

		registry.set(this.name, this);
	}
}



/**
 * RouteTree mounting point
 */
export const path = "_/endpoint/$";

export const parameters = {
	"$": String
}

export async function loader(ctx: RouteContext<typeof parameters>) {
	const endpoint = registry.get(ctx.params["$"]);
	if (!endpoint) return null;

	const res = await endpoint.render(ctx);
	if (res === null) return null;
	if (res instanceof Response) return res;

	return ctx.render(res, ctx.headers);
}
export const action = loader;