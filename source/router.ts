import { AssertUnreachable, ServerOnlyWarning } from "./internal/util.js";
ServerOnlyWarning("router");

import type { GenericContext } from "./internal/router.js";
import type { RequestTimer } from "./timer.js";
import { Parameterized, ParameterPrelude, ParameterShaper } from './util/parameters.js';
import { RouteModule } from "./index.js";
import { MakeStatus } from "./status.js";
import { Cookies } from './cookies.js';

// builtin routes
import * as endpoint from './endpoint.js';
import * as dynamic from './defer.js';
import * as mount from './internal/mount.js';
import * as css from './css.js';
import { html } from "./response.js";

export function GenerateRouteTree(props: {
	modules: Record<string, unknown>,
	scope: string,
}) {
	if (!props.scope.endsWith("/")) props.scope += "/";

	const tree = new RouteTree();
	for (const path in props.modules) {
		const mod  = props. modules[path] as RouteModule<any>;

		let tail = path.lastIndexOf(".");
		if (path.endsWith("/_index", tail)) tail -= "/_index".length;

		const url = path.slice(props.scope.length-1, tail);
		const leaf = new RouteLeaf(mod, url);
		tree.ingest(leaf);

		if (mod.route) mod.route(url as any);
	}

	// ingest router builtins
	tree.ingest(new RouteLeaf(endpoint, endpoint.path));
	tree.ingest(new RouteLeaf(dynamic,  dynamic.path));
	tree.ingest(new RouteLeaf(mount,    mount.path));
	tree.ingest(new RouteLeaf(css,      css.path));

	return tree;
}




export class RouteContext<T extends ParameterShaper = {}> {
	readonly path:    string;
	readonly request: Request;
	readonly headers: Headers; // response headers
	readonly cookie:  Cookies;
	readonly params:  Parameterized<T>;
	readonly url:     URL;
	readonly timer:   RequestTimer;

	render: GenericContext["render"];

	constructor(base: GenericContext | RouteContext, params: ParameterPrelude<T>, shape: T, path: string) {
		this.path    = path;
		this.cookie  = base.cookie;
		this.headers = base.headers;
		this.request = base.request;
		this.render  = base.render;
		this.timer   = base.timer;
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

	ingest(node: RouteLeaf, path?: string[]): void {
		if (!path) path = node.path.length === 0 ? [] : node.path.slice(1).split("/");

		if (path.length === 0) {
			this.index = node;
			return;
		}

		if (path[0] === "$") {
			this.slug = node;
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

			this.wild.ingest(node, path.slice(1));
			return;
		}

		let next = this.nested.get(path[0]);
		if (!next) {
			next = new RouteTree();
			this.nested.set(path[0], next);
		}

		next.ingest(node, path.slice(1));
	}

	async resolve(fragments: string[], ctx: GenericContext, offset: number): Promise<Response | null> {
		if (!this.slug) return await this._resolve(fragments, ctx, offset);

		try {
			return await this._resolve(fragments, ctx, offset);
		} catch (e) {
			return this.unwrap(ctx, e);
		}
	}

	private async _resolve(fragments: string[], ctx: GenericContext, offset: number): Promise<Response | null> {
		let res = (fragments.length - offset < 1
				? await this.resolveIndex(fragments, ctx, offset)
				: await this.resolveNext(fragments, ctx, offset)
			)
			|| await this.resolveWild(fragments, ctx, offset)
			|| await this.resolveSlug(fragments, ctx, offset);

		if (res instanceof Response) {
			if (res.ok) return res;
			if (100 <= res.status && res.status <= 399) return res;
			if (res.headers.has("X-Caught")) return res;

			return this.unwrap(ctx, res);
		}

		return res;
	}

	private async resolveIndex(fragments: string[], ctx: GenericContext, offset: number): Promise<Response | null> {
		if (!this.index) return null;

		const res = await this.index.resolve(ctx);
		if (res instanceof Response) return res;
		if (res === null) return null;

		AssertUnreachable(res);
	}

	private async resolveNext(fragments: string[], ctx: GenericContext, offset: number): Promise<Response | null> {
		const next = this.nested.get(fragments[offset]);
		if (!next) return null;

		return await next.resolve(fragments, ctx, offset+1);
	}

	private async resolveWild(fragments: string[], ctx: GenericContext, offset: number): Promise<Response | null> {
		if (!this.wild) return null;
		if (fragments.length < 1) return null;

		ctx.params[this.wildCard] = fragments[offset];
		return this.wild.resolve(fragments, ctx, offset+1);
	}

	private async resolveSlug(fragments: string[], ctx: GenericContext, offset: number): Promise<Response | null> {
		if (!this.slug) return null;

		ctx.params["$"] = fragments.slice(offset).join("/");

		const res = await this.slug.resolve(ctx);
		if (res instanceof Response) return res;
		if (res === null) return null;

		AssertUnreachable(res);
	}

	unwrap(ctx: GenericContext, res: unknown): Promise<Response> {
		if (!this.slug) throw res;
		return this.slug.error(ctx, res);
	}
}

class RouteLeaf {
	private module: RouteModule<any>;
	readonly path: string;

	constructor(module: RouteModule<any>, path: string) {
		this.module = module;
		this.path = path;
	}

	async resolve(ctx: GenericContext): Promise<Response | null> {
		const jsx = await this.response(ctx);
		if (jsx === null) return null;
		if (jsx instanceof Response) return jsx;

		const res = ctx.render(jsx);
		return html(res, { headers: ctx.headers });
	}

	async error(ctx: GenericContext, e: unknown): Promise<Response> {
		if (!this.module.error) throw e;

		const jsx = await this.module.error(ctx.shape({}, this.path), e);

		let caught: Response | string;
		if (jsx instanceof Response) caught = jsx;
		else caught = ctx.render(jsx);

		if (caught instanceof Response) {
			caught.headers.set("X-Caught", "true");
			return caught;
		}

		ctx.headers.set("X-Caught", "true");
		return html(caught, e instanceof Response ? e : MakeStatus("Internal Server Error", ctx.headers));
	}

	private async response(ctx: GenericContext): Promise<JSX.Element | null> {
		try {
			if (!this.module.loader && !this.module.action) return null;

			const context = ctx.shape(this.module.parameters || {}, this.path);

			if (ctx.request.method === "HEAD" || ctx.request.method === "GET") {
				if (this.module.loader) return await this.module.loader(context);
				else return null;
			}

			if (this.module.action) return await this.module.action(context);
			throw new Response("Method not Allowed", MakeStatus("Method Not Allowed", ctx.headers));
		} catch (e) {
			if (e instanceof Response && e.headers.has("X-Caught")) return e;
			return await this.error(ctx, e);
		}

		return null;
	}
}