#!/usr/bin/env node
"use strict";

import { writeFileSync } from "fs";

const script = `import { HttpResolutionHelper, RenderRoute } from '~/router/helper';
import { RouteContext } from '~/router/router';
import { RouteModule } from '~/router/shared';
import { RouteTree } from '~/router';

import type * as http from "http";

const modules = import.meta.glob('./routes/**/*.{ts,tsx}', { eager: true });

const tree = new RouteTree();
for (const path in modules) {
	const tail = path.lastIndexOf(".");
	const url = path.slice("./routes/".length, tail);
	tree.ingest(url, modules[path] as RouteModule);
}

export function Resolve(req: http.IncomingMessage & { originalUrl?: string }, renderer: RouteContext["render"]): Promise<Response> {
	return HttpResolutionHelper(req, tree, renderer);
}

export { RenderRoute };`;

export function BuildDynamic(cwd: string) {
	writeFileSync(`${cwd}/router.ts`, script);
	console.log( `Finished Building`);
}