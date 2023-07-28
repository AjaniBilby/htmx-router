#!/usr/bin/env node
"use strict";

import { BuildDynamic } from "./dynamic";
import { BuildStatic } from "./static";

const isDynamic = process.argv.includes('--dynamic');
const cwd = process.argv[2] || "./";

console.log(`Building ${isDynamic ? "dynamic" : "static"} routes`);
if (isDynamic) {
	BuildDynamic(cwd);
} else {
	BuildStatic(cwd);
}