#!/usr/bin/env node
"use strict";

import { readdirSync, writeFileSync } from "fs";
import { extname, join, relative } from "path";

import { IsAllowedExt } from "../router";

function readDirRecursively(dir: string) {
	const files = readdirSync(dir, { withFileTypes: true });

	let filePaths: string[] = [];
	for (const file of files) {
		if (file.isDirectory()) {
			filePaths = [...filePaths, ...readDirRecursively(join(dir, file.name))];
		} else {
			filePaths.push(join(dir, file.name));
		}
	}

	return filePaths;
}

export function BuildStatic(cwd: string) {
	const rootMatcher = new RegExp(/^root\.(j|t)sx?$/);
	const root = readdirSync(cwd)
		.filter(x => rootMatcher.test(x))[0];

	if (!root) {
		console.log(`Missing root.jsx/tsx`);
		process.exit(1);
	}


	const DIR = './routes';
	const files = readDirRecursively(`${cwd}/routes`)
		.filter(x => IsAllowedExt(extname(x)))
		.map(x => relative(cwd,
			x.slice(0, x.lastIndexOf("."))
		).replace(/\\/g, "/"))
		.sort();

	let script = `import { RouteTree } from "htmx-router";\n`;
	for (let i=0; i<files.length; i++) {
		const file = files[i];
		script += `import * as Route${i} from "./${file}";\n`;
	}

	script += `import * as RootRoute from "./root";\n`

	script += `\nexport const Router = new RouteTree();\n`;
	for (let i=0; i<files.length; i++) {
		const file = files[i];
		script += `Router.ingest("${file.slice(DIR.length-1)}", Route${i}, [false]);\n`;
	}
	script += `Router.assignRoot(RootRoute);\n`

	writeFileSync(`${cwd}/router.ts`, script);
	console.log( `Build with routes;\n` + files.map(x => `  - ${x}`).join("\n"));
}