import { ServerOnlyWarning } from "../util.js";
ServerOnlyWarning("request/server");

import type { ViteDevServer } from "vite";

import { connectToWeb } from "./compatibility/vite/connectToWeb.js";

import { RouteTree, RouteResolver } from "../../router.js";
import { GenericContext } from "../router.js";
import { RouterModule } from "./index.js";
import { NodeAdaptor } from "./compatibility/node.js";
import { MakeStatus } from "../../status.js";
import { redirect } from "../../response.js";

export type Config = {
	build:  () => Promise<RouterModule> | Promise<RouterModule>,
	render: (res: JSX.Element) => string,

	// dev only
	viteDevServer: ViteDevServer | null,

	headers?: Headers, // default headers used for all requests

	poweredBy?: boolean
	timers?: boolean // enable or disable X-Time headers
};

type ServerBindType = "pre" | "post";
type ServerBind = (ctx: GenericContext) => Promise<Response | null> | Response | null;

type Transformer = (ctx: GenericContext, res: Response) => Promise<Response | void> | Response | void;


function UrlCleaner({ url }: GenericContext) {
	let i = url.pathname.lastIndexOf("/");
	if (i === 0) return null;
	if (i !== url.pathname.length-1) return null;

	i--;
	while (url.pathname[i] === '/' && i > 0) i--;

	if (i === 0) url.pathname = '/';
	else url.pathname = url.pathname.slice(0, i);

	return redirect(url.toString(), { permanent: true });
}


export class HtmxRouterServer {
	readonly vite:   Config["viteDevServer"];
	readonly render: Config["render"];
	readonly build:  Config["build"];
	readonly headers:   Headers;
	readonly timers: boolean;

	#binding: {
		pre:       Array<ServerBind>,
		post:      Array<ServerBind>,
		transform: Array<Transformer>,
	}

	constructor (config: Config) {
		this.vite = config.viteDevServer;

		this.timers = config.timers === undefined ? !!config.viteDevServer : config.timers;
		this.render = config.render;
		this.build = config.build;


		this.headers = config.headers || new Headers();
		if (config.poweredBy !== false && !this.headers.has("Powered-By")) this.headers.set("X-Powered-By", "htmx-router");
		if (!this.headers.has("Content-Type")) this.headers.set("Content-Type", "text/html; charset=UTF-8");

		this.#binding = {
			pre:  [UrlCleaner],
			post: [],
			transform: []
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

	/**
	 * Be careful with your transformers, there is no error unwrapping built in
	 * @param binding
	 * @returns
	 */
	useTransform(binding: Transformer) {
		this.#binding.transform.push(binding);
		return;
	}

	async transform(ctx: GenericContext, res: Response) {
		if (this.#binding.transform.length < 1) return res;

		ctx.timer.checkpoint("transform");
		for (const process of this.#binding.transform) {
			const next = process(ctx, res);
			if (next instanceof Response) res = next;
		}

		ctx.finalize(res);

		return res;
	}

	async resolve<T extends boolean> (request: Request, resolve404: T = true as T): Promise<T extends true ? Response : (Response | null)> {
		const url = new URL(request.url);
		const ctx = new GenericContext(request, url, this);

		{ // pre-binding
			const res = await this.#applyBindings("pre", ctx);
			if (res) return await this.transform(ctx, res);
		}

		{ // route
			const tree = await this.#getTree();
			const res = await this.#resolveRoute(ctx, tree);
			if (res) return await this.transform(ctx, res);
		}

		{ // post-binding
			const res = await this.#applyBindings("post", ctx);
			if (res) return await this.transform(ctx, res);
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

		if (ctx instanceof Request) ctx = new GenericContext(ctx, new URL(ctx.url), this);

		const tree = await this.#getTree();

		const chain = new RouteResolver(ctx, [], tree);

		const res = await chain.unwind(e, 0);
		return await this.transform(ctx, res);
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

		const x = ctx.url.pathname.slice(1);
		const fragments = x === "" ? [] : x.split("/");
		const chain = new RouteResolver(ctx, fragments, tree);

		try {
			const res = await chain.resolve();
			if (res === null) return null;
			response = res;
		} catch (e) {
			if (e instanceof Error) this.vite?.ssrFixStacktrace(e);
			console.error(e);
			response = await chain.unwind(e, 0);
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