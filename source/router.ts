import type http from "node:http";
import {
	ErrorResponse,
	Outlet,
	Override,
	Redirect,
	RenderArgs,
	RouteModule
} from "./shared";

export function IsAllowedExt(ext: string) {
	if (ext[0] !== ".") return false;

	// js, jsx, tsx, ts
	if (ext[2] !== "s") return false;
	if (ext[1] !== "j" && ext[1] !== "t" ) return false;

	if (ext.length == 3) return true;
	if (ext.length != 4) return false;
	if (ext[3] !== "x") return false;

	return true;
}


async function blankOutlet() {
	return "";
}


class RouteLeaf {
	module : RouteModule;
	mask   : boolean[];

	constructor(module: RouteModule, mask: boolean[]) {
		this.module = module;
		this.mask   = mask;
	}

	makeOutlet(args: RenderArgs, outlet: Outlet, depth: number): Outlet {
		const renderer = this.module.Render || blankOutlet;
		const catcher  = this.module.CatchError;

		return async () => {
			try {
				args.depth = depth;
				return await renderer(args, outlet);
			} catch (e) {
				if (e instanceof Redirect || e instanceof Override)
					throw e;

				const err = (e instanceof ErrorResponse) ? e :
					new ErrorResponse(500, "Runtime Error", e);

				if (catcher) {
					args.depth = depth;
					return await catcher(args, err);
				}

				throw err;
			}
		}
	}
}


export class RouteTree {
	nested   : Map<string, RouteTree>;

	// Wild card route
	// e.g. $userID
	wild: RouteTree | null;
	wildCard: string;

	// Leaf nodes
	default : RouteLeaf | null; // about.index_
	route   : RouteLeaf | null; // about

	constructor() {
		this.nested   = new Map();
		this.wildCard = "";
		this.wild = null;

		this.default = null;
		this.route   = null;
	}

	assignRoot(module: RouteModule) {
		if (!module.Render)
			throw new Error(`Root route is missing Render()`);
		if (!module.CatchError)
			throw new Error(`Root route is missing CatchError()`);

		this.route = new RouteLeaf(module, []);
	}

	ingest(path: string| string[], module: RouteModule, override: boolean[]) {
		if (!Array.isArray(path)) {
			path = path.split(/[\./\\]/g);
		}

		if (path.length === 0) {
			this.route = new RouteLeaf(module, override);
			return;
		}
		if (path.length === 1 && path[0] === "_index") {
			this.default = new RouteLeaf(module, override);
			return;
		}

		if (path[0].endsWith("_")) {
			path[0] = path[0].slice(0, -1);
			override.push(true);
		} else {
			override.push(false);
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
			this.wild.ingest(path, module, override);
			return;
		}

		let next = this.nested.get(path[0]);
		if (!next) {
			next = new RouteTree();
			this.nested.set(path[0], next);
		}

		path.splice(0, 1);
		next.ingest(path, module, override);
	}


	async render(req: http.IncomingMessage, res: http.ServerResponse, url: URL) {
		const args = new RenderArgs(req, res, url);

		if (!this.default || !this.default.module.Render) {
			return "";
		}

		const frags = url.pathname.split('/').slice(1);
		if (frags.length === 1 && frags[0] === "") {
			frags.splice(0, 1);
		}

		try {
			const out = await this._recursiveRender(
				args,
				frags
			).outlet();

			return out;
		} catch (e: any) {
			if (e instanceof Redirect) return e;
			if (e instanceof Override) return e;

			throw new Error(`Unhandled boil up type ${typeof(e)}: ${e}`);
		};
	}

	private _recursiveRender(args: RenderArgs, frags: string[]) {
		let out = {
			outlet: blankOutlet,
			mask: [] as boolean[],
		};

		if (frags.length == 0) {
			if (!this.default) {
				out.outlet = () => { throw new ErrorResponse(404, "Resource Not Found",
					`Unable to find ${args.url.pathname}`
				)}
			} else if (this.default?.module.Render) {
				out.mask   = [...this.default.mask];
				out.outlet = this.default.makeOutlet(args, out.outlet, out.mask.length);
			}
		} else {
			const segment  = frags.splice(0, 1)[0];
			const subRoute = this.nested.get(segment);

			if (subRoute) {
				out = subRoute._recursiveRender(args, frags);
			} else if (this.wild) {
				args.params[this.wildCard] = segment;
				out = this.wild._recursiveRender(args, frags);
			} else {
				out.outlet = () => { throw new ErrorResponse(404, "Resource Not Found",
					`Unable to find ${args.url.pathname}`
				)}
			}
		}

		// Is this route masked out?
		const ignored = out.mask.splice(0, 1)[0] === true;
		if (!ignored && this.route) {
			out.outlet = this.route.makeOutlet(args, out.outlet, out.mask.length);
		}

		return out;
	}
}
