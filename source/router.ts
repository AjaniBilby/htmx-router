import type http from "node:http";
import {
	ErrorResponse,
	Override,
	Redirect,
	RouteModule
} from "./shared";

import {
	MaskType,
	RenderArgs
} from "./render-args";

import * as BlankRoute from "./404-route";

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


export class RouteLeaf {
	module : RouteModule;
	mask   : boolean[];

	constructor(module: RouteModule, mask: boolean[]) {
		this.module = module;
		this.mask   = mask;
	}

	async render(args: RenderArgs, mask: MaskType, routeName: string): Promise<string> {
		try {
			if (this.module.Auth)
				return await this.module.Auth(args);
			if (mask === MaskType.show) {
				if (this.module.Render)
					return await this.module.Render(routeName, args);
			} else {
				return await args.Outlet();
			}
		} catch (e) {
			if (e instanceof Redirect || e instanceof Override)
				throw e;

			const err = (e instanceof ErrorResponse) ? e :
				new ErrorResponse(500, "Runtime Error", e);

			if (this.module.CatchError)
				return await this.module.CatchError(routeName, args, err);

			throw err;
		}

		return "";
	}
}


const blankLeaf = new RouteLeaf(BlankRoute, []);


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
			override.push(false);
			this.route = new RouteLeaf(module, override);
			return;
		}
		if (path.length === 1 && path[0] === "_index") {
			override.push(false);
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


	calculateDepth(from: string[], to: string[]): number {
		let depth = 0;
		if (from.length == 0 || to.length == 0) {
			depth = 1;
		} else {
			const segmentA = from.splice(0, 1)[0];
			const segmentB = to.splice(0, 1)[0];
			const subRoute = this.nested.get(segmentA);

			if (subRoute && segmentA === segmentB) {
				depth = subRoute.calculateDepth(from, to);
			} else if (this.wild) {
				depth = this.wild.calculateDepth(from, to);
			} else {
				return 1;
			}
		}

		depth++;
		return depth;
	}


	async render(req: http.IncomingMessage, res: http.ServerResponse, url: URL) {
		if (url.pathname.length != 1 && url.pathname.endsWith("/")) {
			return new Redirect(url.pathname.slice(0, -1) + url.search);
		}

		const args = new RenderArgs(req, res, url);

		res.setHeader('Vary', "hx-current-url");
		const from = req.headers['hx-current-url'] ?
			new URL(req.headers['hx-current-url']?.toString() || "/").pathname :
			"";

		try {
			const depth = BuildOutlet(this, args, from);
			if (from) {
				res.setHeader('HX-Push-Url', req.url || "/");
				if (depth > 0) {
					res.setHeader('HX-Retarget', `#hx-route-${depth.toString(16)}`);
				}
				res.setHeader('HX-Reswap', "outerHTML");
			}

			const out = await args.Outlet();

			if (args.title) {
				const trigger = res.getHeader('HX-Trigger');
				const entry   = `{"setTitle":"${args.title.replace(/"/g, `\\"`)}"}`;
				if (Array.isArray(trigger)) {
					res.setHeader('HX-Trigger', [...trigger, entry]);
				} else if (trigger) {
					res.setHeader('HX-Trigger', [trigger.toString(), entry]);
				} else {
					res.setHeader('HX-Trigger', [entry]);
				}
			}

			return out;
		} catch (e: any) {
			if (e instanceof Redirect) return e;
			if (e instanceof Override) return e;

			console.error(e);
			throw new Error(`Unhandled boil up type ${typeof(e)}: ${e}`);
		};
	}
}

function BuildOutlet(start: RouteTree, args: RenderArgs, fromPath: string) {
	const frags = args.url.pathname.split('/').slice(1);
	if (frags.length === 1 && frags[0] === "") {
		frags.splice(0, 1);
	}
	const from = fromPath.split('/').slice(1);
	if (from.length === 1 && from[0] === "") {
		from.splice(0, 1);
	}

	let matching = fromPath.length > 0;
	let depth = -1;

	const stack: RouteTree[] = [start];
	let mask: null | boolean[] = null;

	while (stack.length > 0) {
		const cursor = stack.pop() as RouteTree;
		if (!mask) {
			stack.push(cursor);

			if (frags.length === 0) {
				if (matching && from.length !== 0) {
					depth = args._outletChain.length + stack.length;
					matching = false;
				};

				if (cursor.default) {
					args._addOutlet(cursor.default);
					mask = cursor.default.mask;
				} else {
					args._addOutlet(blankLeaf);
					mask = [];
				}
			} else {
				if (matching && from.length === 0) {
					depth = args._outletChain.length + stack.length;
					matching = false;
				}

				const segment  = frags.splice(0, 1)[0];
				const other    = from.splice(0, 1)[0];
				const subRoute = cursor.nested.get(segment);

				if (subRoute) {
					if (matching && segment !== other) {
						depth = args._outletChain.length + stack.length;
						matching = false;
					};

					stack.push(subRoute);
				} else if (cursor.wild) {
					if (matching && cursor.nested.has(other)) {
						depth = args._outletChain.length + stack.length;
						matching = false;
					};

					args.params[cursor.wildCard] = segment;
					stack.push(cursor.wild);
				} else {
					args._addOutlet(blankLeaf);
					mask = [];
				}
			}

		} else {
			if (cursor.route) {
				args._addOutlet(cursor.route);
			}
		}
	}

	if (matching) {
		depth = args._outletChain.length-1;
	}

	args._applyMask(mask as boolean[], depth);
	return depth;
}
