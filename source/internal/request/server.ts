import { ServerOnlyWarning } from "../util.js";
ServerOnlyWarning("request/server");

import type { ViteDevServer } from "vite";

import { connectToWeb } from "./compatibility/vite/connectToWeb.js";

import { GenericContext } from "../router.js";
import { RouterModule } from "./index.js";
import { NodeAdaptor } from "./compatibility/node.js";
import { MakeStatus } from "../../status.js";
import { RouteTree } from "../../router.js";

export type Config = {
	build:  () => Promise<RouterModule> | Promise<RouterModule>,
	render: GenericContext["render"],

	// dev only
	viteDevServer: ViteDevServer | null,
};

type ServerBindType = "pre" | "post";
type ServerBind = (ctx: GenericContext) => Promise<Response | null> | Response | null;


function UrlCleaner({ url }: GenericContext) {
	const i = url.pathname.lastIndexOf("/");
	if (i === 0) return null;
	if (i !== url.pathname.length-1) return null;

	url.pathname = url.pathname.slice(0, -1);
	return new Response("", MakeStatus("Permanent Redirect", {
		headers: { location: url.toString() }
	}));
}


export class HtmxRouterServer {
	readonly vite:   Config["viteDevServer"];
	readonly render: Config["render"];
	readonly build:  Config["build"];

	#binding: {
		pre:  Array<ServerBind>,
		post: Array<ServerBind>
	}

	constructor (config: Config) {
		this.vite = config.viteDevServer;

		this.render = config.render;
		this.build  = config.build;

		this.#binding = {
			pre:  [UrlCleaner],
			post: []
		}

		if (this.vite) {
			const handler = connectToWeb(this.vite.middlewares);
			this.#binding.post.push(handler);
		}
	}


	/**
	 * Add a middleware to resolve requests before/after the route tree attempts to resolve
	 */
	use(type: ServerBindType, binding: ServerBind) {
		if (type === "pre") {
			this.#binding.pre.push(binding);
			return;
		}

		if (type === "post") {
			this.#binding.post.push(binding);
			return;
		}

		throw new Error(`Unknown binding type "${type}"`);
	}

	async resolve<T extends boolean> (request: Request, resolve404: T = true as T): Promise<T extends true ? Response : (Response | null)> {
		const url = new URL(request.url);
		const ctx = new GenericContext(request, url, this.render);

		{ // pre-binding
			const res = await this.#applyBindings("pre", ctx);
			if (res) return res;
		}

		const tree = await this.#getTree();
		{ // route
			const res = await this.#resolveRoute(ctx, tree);
			if (res) return res;
		}

		{ // post-binding
			const res = await this.#applyBindings("post", ctx);
			if (res) return res;
		}

		if (resolve404) return await this.error(ctx, undefined);

		return null as unknown as any;
	}

	/**
	 * Use the top level error handler in the route tree to render an error
	 * @param ctx The context the error came from
	 * @param e The error that caused it (if undefined, will be a 404 response)
	 */
	async error(ctx: Request | GenericContext, e: unknown | undefined) {
		if (e === undefined) e = new Response("No Route", MakeStatus("Not Found"));

		if (ctx instanceof Request) ctx = new GenericContext(ctx, new URL(ctx.url), this.render);

		const tree = await this.#getTree();

		return await tree.unwrap(ctx, e);
	}

	/**
	 * Create a closure for use with the classic express.js like servers
	 */
	nodeAdaptor(resolve404 = true) {
		return NodeAdaptor(this, resolve404);
	}



	async #getTree(): Promise<RouteTree> {
		const mod: RouterModule = typeof this.build === "function" ? await this.build() : await this.build;
		return mod.tree;
	}

	async #resolveRoute(ctx: GenericContext, tree: RouteTree) {
		let response: Response;
		try {
			const x = ctx.url.pathname.slice(1);
			const fragments = x === "" ? [] : x.split("/");


			const res = await tree.resolve(fragments, ctx);
			if (res === null) return null;
			response = res;
		} catch (e) {
			if (e instanceof Error) this.vite?.ssrFixStacktrace(e);
			console.error(e);
			response = await tree.unwrap(ctx, e);
		}

		// context merge headers if divergent
		if (response.headers !== ctx.headers) {
			for (const [key, value] of ctx.headers) {
				if (key === "content-type") continue;
				response.headers.set(key, value);
			}
		}

		// merge in cookie changes
		const cookies = ctx.cookie.export();
		for (const cookie of cookies) response.headers.append("Set-Cookie", cookie);

		return response;
	}

	async #applyBindings(type: ServerBindType, ctx: GenericContext) {
		const set = this.#binding[type];
		if (!set) throw new Error(`Unknown binding type "${type}"`);

		try {
			for (const bind of set) {
				const res = bind(ctx);
				if (res) return res;
			}
		} catch (e) {
			return this.error(ctx.request, e);
		}
	}
}