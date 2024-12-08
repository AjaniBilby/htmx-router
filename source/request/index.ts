import type { ViteDevServer } from "vite";

import * as native from "~/request/native.js";
import * as http from "~/request/http.js";
import { RouteContext, RouteTree } from '~/router.js';

export type Config = {
	build: Promise<any> | (() => Promise<Record<string, any>>),
	viteDevServer: ViteDevServer | null,
	render: RouteContext["render"]
};

export type RouterModule = { tree: RouteTree }

export const createRequestHandler = {
	http: http.createRequestHandler,
	native: native.createRequestHandler
}