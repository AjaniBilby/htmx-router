import { ServerOnlyWarning } from "../util.js";
ServerOnlyWarning("request");

import type { ViteDevServer } from "vite";

import type { GenericContext } from "../router.js";
import type { RouteTree } from '../../router.js';
import * as native from "./native.js";
import * as http from "./http.js";

export type Config = {
	build: Promise<any> | (() => Promise<Record<string, any>>),
	viteDevServer: ViteDevServer | null,
	render: GenericContext["render"]
};

export type RouterModule = { tree: RouteTree };


export const createRequestHandler = {
	http: http.createRequestHandler,
	native: native.createRequestHandler
};