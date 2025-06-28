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

export class HtmxRouterServer {
	readonly vite: {
		handler: ReturnType<typeof connectToWeb>,
		server:  Config["viteDevServer"]
	} | null

	readonly render: Config["render"];
	readonly build:  Config["build"];

	constructor (config: Config) {
		this.vite = config.viteDevServer ? {
			handler: connectToWeb(config.viteDevServer.middlewares),
			server:  config.viteDevServer
		} : null;

		this.render = config.render;
		this.build  = config.build;
	}

	async getTree(): Promise<RouteTree> {
		const mod: RouterModule = typeof this.build === "function" ? await this.build() : await this.build;
		return mod.tree;
	}

	async resolve (request: Request, resolve404 = false): Promise<Response | null> {
		const url = new URL(request.url);

		{ // clean path url
			const res = this.resolvePathClean(url);
			if (res) return res;
		}

		const ctx = new GenericContext(request, url, this.render);
		const tree = await this.getTree();
		{ // route
			const res = await this.resolveRoute(ctx, tree);
			if (res) return res;
		}

		if (this.vite) {
			const res = await this.vite.handler(request);
			if (res) return res;
		}

		if (resolve404) return await tree.unwrap(ctx, new Response("No Route", MakeStatus("Not Found")));

		return null;
	}

	nodeAdaptor(resolve404 = true) {
		return NodeAdaptor(this, resolve404);
	}

	async error(request: Request, e: unknown) {
		const url  = new URL(request.url);
		const ctx  = new GenericContext(request, url, this.render);
		const tree = await this.getTree();

		return await tree.unwrap(ctx, new Response("No Route", MakeStatus("Not Found")));
	}

	private resolvePathClean(url: URL) {
		const i = url.pathname.lastIndexOf("/");
		if (i === 0) return null;
		if (i !== url.pathname.length-1) return null;

		url.pathname = url.pathname.slice(0, -1);
		return new Response("", MakeStatus("Permanent Redirect", {
			headers: { location: url.toString() }
		}));
	}

	private async resolveRoute(ctx: GenericContext, tree: RouteTree) {
		let response: Response;
		try {
			const x = ctx.url.pathname.slice(1);
			const fragments = x === "" ? [] : x.split("/");


			const res = await tree.resolve(fragments, ctx);
			if (res === null) return null;
			response = res;
		} catch (e) {
			if (e instanceof Error) this.vite?.server?.ssrFixStacktrace(e);
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
}