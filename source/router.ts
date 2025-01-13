import { ServerOnlyWarning } from "./internal/util.js";
ServerOnlyWarning("router");

import type { GenericContext } from "./internal/router.js";
import { Parameterized, ParameterPrelude, ParameterShaper } from './util/parameters.js';
import { RouteModule } from "./index.js";
import { Cookies } from './cookies.js';

// builtin routes
import * as endpoint from './endpoint.js';
import * as dynamic from './defer.js';
import * as mount from './internal/mount.js';
import * as css from './css.js';

export function GenerateRouteTree(props: {
	modules: Record<string, unknown>,
	scope: string,
}) {
	if (!props.scope.endsWith("/")) props.scope += "/";

	const tree = new RouteTree();
	for (const path in props.modules) {
		const mod  = props. modules[path] as RouteModule<any>;
		const tail = path.lastIndexOf(".");
		const url  = path.slice(props.scope.length, tail);
		tree.ingest(url, mod);

		if (mod.route) mod.route(url as any);
	}

	// ingest router builtins
	tree.ingest(endpoint.path, endpoint);
	tree.ingest(dynamic.path, dynamic);
	tree.ingest(mount.path, mount);
	tree.ingest(css.path, css);

	return tree;
}




export class RouteContext<T extends ParameterShaper = {}> {
	readonly request: Request;
	readonly headers: Headers; // response headers
	readonly cookie:  Cookies;
	readonly params:  Parameterized<T>;
	readonly url:     URL;

	render: GenericContext["render"];

	constructor(base: GenericContext | RouteContext, params: ParameterPrelude<T>, shape: T) {
		this.cookie  = base.cookie;
		this.headers = base.headers;
		this.request = base.request;
		this.render  = base.render;
		this.url     = base.url;


		this.params = {} as Parameterized<T>;
		for (const key in shape) {
			if (!(key in params)) console.warn(`Parameter ${key} not present in route, but defined in parameters`);

			const func = shape[key];
			const val = func(params[key] || "");

			// NaN moment
			if ((func as unknown) === Number && typeof val === "number" && isNaN(val)) throw new Error("Invalid Number");

			this.params[key] = val;
		}
	}
}





export class RouteTree {
	private nested: Map<string, RouteTree>;

	// Leaf nodes
	private index: RouteLeaf | null; // _index.tsx

	// Wild card routes
	private slug: RouteLeaf | null; // $
	private wild: RouteTree | null; // e.g. $userID
	private wildCard: string;

	constructor() {
		this.nested = new Map();
		this.index  = null;

		this.wildCard = "";
		this.wild = null;
		this.slug = null;
	}

	ingest(path: string | string[], module: RouteModule<any>) {
		if (!Array.isArray(path)) path = path.split("/");


		if (path.length === 0 || (path.length == 1 && path[0] === "_index")) {
			this.index = new RouteLeaf(module);
			return;
		}

		if (path[0] === "$") {
			this.slug = new RouteLeaf(module);
			return;
		}

		if (path[0][0] === "$") {
			const wildCard = path[0].slice(1);
			// Check wildcard isn't being changed
			if (!this.wild) {
				this.wildCard = wildCard;
				this.wild = new RouteTree();
			} else if (wildCard !== this.wildCard) {
				throw new Error(`Redefinition of wild card ${this.wildCard} to ${wildCard}`);
			}

			path.splice(0, 1);
			this.wild.ingest(path, module);
			return;
		}

		let next = this.nested.get(path[0]);
		if (!next) {
			next = new RouteTree();
			this.nested.set(path[0], next);
		}

		path.splice(0, 1);
		next.ingest(path, module);
	}

	async resolve(fragments: string[], ctx: GenericContext): Promise<Response | null> {
		if (!this.slug) return await this._resolve(fragments, ctx);

		try {
			return await this._resolve(fragments, ctx);
		} catch (e) {
			return this.unwrap(ctx, e);
		}
	}

	private async _resolve(fragments: string[], ctx: GenericContext): Promise<Response | null> {
		let res = await this.resolveIndex(fragments, ctx)
			|| await this.resolveNext(fragments, ctx)
			|| await this.resolveWild(fragments, ctx)
			|| await this.resolveSlug(fragments, ctx);

		if (res instanceof Response) {
			if (res.ok) return res;
			if (100 <= res.status && res.status <= 399) return res;
			if (res.headers.has("X-Caught")) return res;

			return this.unwrap(ctx, res);
		}

		return res;
	}

	private async resolveIndex(fragments: string[], ctx: GenericContext): Promise<Response | null> {
		if (fragments.length > 0) return null;
		if (!this.index) return null;

		const res = await this.index.resolve(ctx);
		if (res instanceof Response) return res;
		if (res === null) return null;

		return new Response(res, { headers: ctx.headers });
	}

	private async resolveNext(fragments: string[], ctx: GenericContext): Promise<Response | null> {
		if (fragments.length < 1) return null;


		const next = this.nested.get(fragments[0]);
		if (!next) return null;

		return await next.resolve(fragments.slice(1), ctx);
	}

	private async resolveWild(fragments: string[], ctx: GenericContext): Promise<Response | null> {
		if (!this.wild) return null;
		if (fragments.length < 1) return null;

		ctx.params[this.wildCard] = fragments[0];
		return this.wild.resolve(fragments.slice(1), ctx);
	}

	private async resolveSlug(fragments: string[], ctx: GenericContext): Promise<Response | null> {
		if (!this.slug) return null;

		ctx.params["$"] = fragments.join("/");

		const res = await this.slug.resolve(ctx);
		if (res instanceof Response) return res;
		if (res === null) return null;

		return new Response(res, { headers: ctx.headers });
	}

	private async unwrap(ctx: GenericContext, res: unknown): Promise<Response | null> {
		if (!this.slug) throw res;

		const caught = await this.slug.error(ctx, res);

		if (caught instanceof Response) {
			caught.headers.set("X-Caught", "true");
			return caught;
		}

		ctx.headers.set("X-Caught", "true");
		return new Response(caught, res instanceof Response ? res : {
			status: 500,
			statusText: "Internal Server Error",
			headers: ctx.headers
		});
	}
}

class RouteLeaf {
	private module: RouteModule<any>;

	constructor(module: RouteModule<any>) {
		this.module = module;
	}

	async resolve(ctx: GenericContext) {
		const res = await this.response(ctx);
		if (res === null) return null;
		if (res instanceof Response) return res;

		return await ctx.render(res, ctx.headers);
	}

	async error(ctx: GenericContext, e: unknown) {
		if (!this.module.error) throw e;

		const res = await this.module.error(ctx, e);
		if (res instanceof Response) return res;

		return await ctx.render(res, ctx.headers);
	}

	private async response(ctx: GenericContext) {
		try {
			if (!this.module.loader && !this.module.action) return null;

			const context = ctx.shape(this.module.parameters || {});

			if (ctx.request.method === "HEAD" || ctx.request.method === "GET") {
				if (this.module.loader) return await this.module.loader(context);
				else return null;
			}

			if (this.module.action) return await this.module.action(context);
			throw new Response("Method not Allowed", { status: 405, statusText: "Method not Allowed", headers: ctx.headers });
		} catch (e) {
			return await this.error(ctx, e);
		}

		return null;
	}
}