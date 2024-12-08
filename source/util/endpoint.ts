import { RenderFunction } from "~/shared";
import { RouteContext } from "~/router";
import { QuickHash } from "~/util/hash";

const registry = new Map<string, Endpoint>();

export class Endpoint {
	readonly render: RenderFunction;
	readonly name: string;
	readonly url:  string;

	constructor(render: RenderFunction, name?: string) {
		this.render = render;

		name ||= render.constructor.name;

		const hash = QuickHash(String(render));
		this.name = name ? `${encodeURIComponent(name)}-${hash}` : hash;
		this.url = `/_/endpoint/${this.name}`;

		registry.set(this.name, this);
	}
}

export async function _resolve(fragments: string[], ctx: RouteContext) {
	if (!fragments[2]) return null;

	const endpoint = registry.get(fragments[2]);
	if (!endpoint) return null;

	const res = await endpoint.render(ctx);
	if (res === null) return null;
	if (res instanceof Response) return res;

	return ctx.render(res);
}