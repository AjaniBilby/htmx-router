// #!/usr/bin/env node
// "use strict";

import { readdirSync, writeFileSync, existsSync } from "node:fs";
import { extname, join } from "node:path";

import { IsAllowedExt } from "./router";

const rootMatcher = new RegExp(/^root\.(j|t)sx?$/);
const root = readdirSync('./')
	.filter(x => rootMatcher.test(x))[0];

if (!root) {
	console.log(`Missing root.jsx/tsx`);
	process.exit(1);
}



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


const DIR = './routes';
const files = readDirRecursively(DIR)
	.filter(x => IsAllowedExt(extname(x).slice(1)))
	.map(x => x.slice(0, x.lastIndexOf(".")).replace(/\\/g, "/"))
	.sort();

let script = `import { RouteTree } from "../router/index";\n`;
for (let i=0; i<files.length; i++) {
	const file = files[i];
	script += `import * as Route${i} from "./${file}";\n`;
}

script += `import * as RootRoute from "./root";\n`

script += `\nexport const Router = new RouteTree;\n`;
for (let i=0; i<files.length; i++) {
	const file = files[i];
	script += `Router.ingest("${file.slice(DIR.length-1)}", Route${i}, []);\n`;
}
script += `Router.assignRoot(RootRoute);\n`

writeFileSync('./router.ts', script);
console.log( `Build with routes;\n` + files.map(x => `  - ${x}`).join("\n"));