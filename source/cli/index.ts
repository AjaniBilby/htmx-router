#!/usr/bin/env node
"use strict";

import chalk from 'chalk';
import { readFile, writeFile } from "fs/promises";

import * as components from "../internal/component/index.js";
import { CompileManifest } from "../internal/compile/manifest.js";
import { ReadConfig } from "./config.js";

const config = await ReadConfig();

if (config.client) {
	console.info(`Generating ${chalk.green("client island")} manifest`);
	const source = await readFile(config.client.source, "utf8");

	await writeFile(config.client.output.server,
		CompileManifest(config.framework, source, true)
	);
	console.log(`  - ${chalk.cyan("server")} ${chalk.gray(config.client.output.server)}`);

	await writeFile(config.client.output.client,
		CompileManifest(config.framework, source, false)
	);
	console.log(`  - ${chalk.cyan("client")} ${chalk.gray(config.client.output.client)}`);

	console.log("");
}

if (config.component) {
	console.info(`Generating ${chalk.green("components")} for ${chalk.cyan(config.framework)}`);

	const padding = Math.max(...Object.keys(config.component).map(x => x.length)) || 0;

	for (const key in config.component) {
		const prefix = `  - ${chalk.cyan(key)}` + " ".repeat(padding+1 - key.length);

		const component = components[key as keyof typeof components];
		if (!component) {
			console.log(prefix+chalk.red("unknown component"));
			continue;
		}

		const source = component[config.framework as keyof typeof component] || component["*" as keyof typeof component];
		if (!source) {
			console.log(prefix+chalk.red("unable to find definition for ")+chalk.cyan(config.framework));
			continue;
		}

		const output = config.component[key];
		await writeFile(output, source);
		console.log(prefix+chalk.gray(output));
	}
}