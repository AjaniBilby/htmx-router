import * as endpoint from '~/util/endpoint.js';
import * as dynamic from '~/util/dynamic.js';
import * as mount from '~/client/mount.js';
import * as css from '~/util/css.js';

import { Parameterize, Parameterized, ParameterShaper } from '~/util/parameters.js';
import { RouteModule } from "~/types.js";
import { Cookies } from '~/util/cookies.js';

export class GenericContext {
	request: Request;
	headers: Headers; // response headers
	cookie: Cookies;
	params: { [key: string]: string };
	url: URL;

	render: (res: JSX.Element) => Response;

	constructor(request: GenericContext["request"], url: GenericContext["url"], renderer: GenericContext["render"]) {
		this.cookie = new Cookies(request.headers);
		this.headers = new Headers();
		this.request = request;
		this.params = {};
		this.url = url;
		this.render = renderer;

		this.headers.set("x-powered-by", "htmx-router");
	}

	shape<T extends ParameterShaper>(shape: T) {
		return new RouteContext(this, shape);
	}
}

export class RouteContext<T extends ParameterShaper> {
	request: Request;
	headers: Headers; // response headers
	cookie: Cookies;
	params: Parameterized<T>;
	url: URL;

	render: (res: JSX.Element) => Response;

	constructor(base: GenericContext, shape: T) {
		this.params = Parameterize(base.params, shape);
		this.cookie  = base.cookie;
		this.headers = base.headers;
		this.request = base.request;
		this.render = base.render;
		this.url = base.url;
	}
}

export class RouteLeaf {
	module: RouteModule<any>;

	constructor(module: RouteModule<any>) {
		this.module = module;
	}

	async resolve(ctx: GenericContext) {
		const res = await this.renderWrapper(ctx);
		if (res === null) return null;
		if (res instanceof Response) return res;

		return ctx.render(res);
	}

	async error(ctx: GenericContext, e: unknown) {
		if (!this.module.error) throw e;

		const res = await this.module.error(ctx, e);
		if (res instanceof Response) return res;

		return ctx.render(res);
	}

	private async renderWrapper(ctx: GenericContext) {
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


export class RouteTree {
	root: boolean;
	nested: Map<string, RouteTree>;

	// Leaf nodes
	index : RouteLeaf | null; // about._index

	// Wild card route
	slug: RouteLeaf | null; // $
	wild: RouteTree | null; // e.g. $userID
	wildCard: string;

	constructor(root = true) {
		this.root = root;
		this.nested = new Map();
		this.wildCard = "";
		this.slug = null;
		this.wild = null;

		this.index = null;
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
				this.wild = new RouteTree(false);
			} else if (wildCard !== this.wildCard) {
				throw new Error(`Redefinition of wild card ${this.wildCard} to ${wildCard}`);
			}

			path.splice(0, 1);
			this.wild.ingest(path, module);
			return;
		}

		let next = this.nested.get(path[0]);
		if (!next) {
			next = new RouteTree(false);
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
		let res = await this.resolveNative(fragments, ctx)
			|| await this.resolveIndex(fragments, ctx)
			|| await this.resolveNext(fragments, ctx)
			|| await this.resolveWild(fragments, ctx)
			|| await this.resolveSlug(fragments, ctx);

		if (res instanceof Response) {
			if (100 <= res.status && res.status <= 399) return res;
			if (res.headers.has("X-Caught")) return res;
			this.unwrap(ctx, res);
		}

		return res;
	}

	private async resolveIndex(fragments: string[], ctx: GenericContext): Promise<Response | null> {
		if (fragments.length > 0) return null;
		if (!this.index) return null;

		return await this.index.resolve(ctx);
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

		const res = this.slug.resolve
			? await this.slug.resolve(ctx)
			: null;

		return res;
	}

	private async resolveNative(fragments: string[], ctx: GenericContext): Promise<Response | null> {
		if (!this.root) return null;
		if (fragments.length < 2) return null;
		if (fragments[0] != "_")  return null;

		return await ResolveNatively(fragments, ctx);
	}

	private async unwrap(ctx: GenericContext, res: unknown): Promise<Response | null> {
		if (!this.slug) throw res;

		const caught = await this.slug.error(ctx, res);
		caught.headers.set("X-Caught", "true");
		return caught;
	}
}

async function ResolveNatively(fragments: string[], ctx: GenericContext): Promise<Response | null> {
	switch (fragments[1]) {
		case "dynamic":  return dynamic._resolve(fragments, ctx);
		case "endpoint": return endpoint._resolve(fragments, ctx);
		case "mount":    return mount._resolve(fragments);
		case "style":    return css._resolve(fragments);
	}

	return null;
}