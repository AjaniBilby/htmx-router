#!/usr/bin/env node
"use strict";

import { BuildDynamic } from "./dynamic";

const cwd = process.argv[2] || "./";

console.log(`Building routes`);
BuildDynamic(cwd);