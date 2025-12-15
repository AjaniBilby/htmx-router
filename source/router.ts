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



export class RouteResolver {
	private stack: { leaf: RouteLeaf, slug?: string }[];
	readonly ctx: GenericContext;
	constructor(ctx: GenericContext, fragments: string[], tree: RouteTree) {
		this.stack = [];
		this.ctx = ctx;

		tree._applyChain(this, fragments, 0);
	}

	push(leaf: RouteLeaf, slug?: string) {
		this.stack.push({ leaf, slug });
	}

	async resolve(): Promise<Response | null> {
		const pull = this.ctx.request.method === "HEAD" || this.ctx.request.method === "GET";

		for (let i=this.stack.length-1; i>=0; i--) {
			const node = this.stack[i];

			// Determine the resolving function
			const resolver = pull ? node.leaf.module.loader : node.leaf.module.action;
			if (!resolver) {
				if (pull) continue;
				return this.unwind(new Response("Method not Allowed", MakeStatus("Method Not Allowed", this.ctx.headers)), i);
			}

			// Apply the slug pseudo parameter if necessary
			if (node.slug) this.ctx.params['$'] = node.slug;

			try {
				const context = this.ctx.shape(node.leaf.module.parameters || {}, node.leaf.path);

				const jsx = await resolver(context);
				if (jsx === null) continue;
				if (jsx instanceof Response) return jsx;

				const res = this.ctx.render(jsx);
				return html(res, { headers: this.ctx.headers });
			} catch (e) {
				return await this.unwind(e, i);
			}
		}

		return null;
	}

	async unwind(e: unknown, offset: number) {
		for (let i=this.stack.length-1; i>=0; i--) {
			const node = this.stack[i];

			if (!node.leaf.module.error) continue;
			if (node.slug) this.ctx.params['$'] = node.slug;

			try {
				const jsx = await node.leaf.module.error(this.ctx.shape({}, node.leaf.path), e);

				let caught: Response | string;
				if (jsx instanceof Response) caught = jsx;
				else caught = this.ctx.render(jsx);

				if (caught instanceof Response) {
					caught.headers.set("X-Caught", "true");
					return caught;
				}

				this.ctx.headers.set("X-Caught", "true");
				return html(caught, e instanceof Response ? e : MakeStatus("Internal Server Error", this.ctx.headers));
			} catch (next) {
				e = next;
			}
		}

		throw e;
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

	_applyChain(out: RouteResolver, fragments: string[], offset = 0): void {
		if (this.slug) {
			const slug = fragments.slice(offset).join('/');
			out.push(this.slug, slug);
		}

		if (offset === fragments.length) {
			if (this.index) out.push(this.index, undefined);
			return;
		}

		const keyed = this.nested.get(fragments[offset]);
		if (keyed) return keyed._applyChain(out, fragments, offset+1);

		if (!this.wild) return;
		out.ctx.params[this.wildCard] = fragments[offset];
		return this.wild._applyChain(out, fragments, offset+1);
	}
}

class RouteLeaf {
	readonly module: RouteModule<any>;
	readonly path: string;

	constructor(module: RouteModule<any>, path: string) {
		this.module = module;
		this.path = path;
	}
}
