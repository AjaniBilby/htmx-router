#!/usr/bin/env node
"use strict";

import { readdirSync, writeFileSync } from "fs";
import { extname, join, relative } from "path";

export function BuildDynamic(cwd: string) {
	const rootMatcher = new RegExp(/^root\.(j|t)sx?$/);
	const root = readdirSync(cwd)
		.filter(x => rootMatcher.test(x))[0];

	if (!root) {
		console.log(`Missing root.jsx/tsx`);
		process.exit(1);
	}

	let script = `import { RouteTree, IsAllowedExt } from "htmx-router";\n`;
	script +=
`import { readdirSync } from "fs";
import { extname, join, relative, resolve } from "path";

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
}\n`;

	script += `\nexport const Router = new RouteTree();\n`;
	script += `import * as RootRoute from "./root";\n`;
	script += `Router.assignRoot(RootRoute);\n\n`;
	script += "const ctx = resolve(`${__dirname}/routes`);\n";
	script += "const files = readDirRecursively(ctx);\n";

	script += "for (const file of files){\n";
	script += "\tconst ext = extname(file);\n";
	script += "\tif (!IsAllowedExt(ext)) continue;\n";
	script += "\tconst url = relative(ctx, file.slice(0, file.lastIndexOf(\".\")).replace(/\\\\/g, \"/\"));\n";
	script += `\timport(file).then((mod) => Router.ingest(url, mod, []));\n`
	script += "}\n";

	writeFileSync(`${cwd}/router.ts`, script);
	console.log( `Finished Building`);
}