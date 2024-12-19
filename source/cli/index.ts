#!/usr/bin/env node
"use strict";

import { writeFile } from "fs/promises";
import { relative } from "path";

import { GenerateClient } from "~/client/index.js";
import { ReadConfig } from "~/cli/config.js";

const config = await ReadConfig();

console.info("Building router");
const routes = relative(config.router.output, config.router.folder).replaceAll("\\", "/").slice(1);
await writeFile(config.router.output, `/*------------------------------------------
 * Generated by htmx-router                *
 * Warn: Any changes will be overwritten   *
-------------------------------------------*/
/* eslint-disable @typescript-eslint/no-explicit-any */

import { GenericContext, RouteTree } from "htmx-router/bin/router";
import { RegisterDynamic } from "htmx-router/bin/util/dynamic";
import { GetClientEntryURL } from 'htmx-router/bin/client/entry';
import { GetMountUrl } from 'htmx-router/bin/client/mount';
import { GetSheetUrl } from 'htmx-router/bin/util/css';
import { RouteModule } from "htmx-router";
import { resolve } from "path";

(globalThis as any).HTMX_ROUTER_ROOT = resolve('${config.router.folder.replaceAll("\\", "/")}');
const modules = import.meta.glob('${routes}/**/*.{ts,tsx}', { eager: true });

export const tree = new RouteTree();
for (const path in modules) {
	const tail = path.lastIndexOf(".");
	const url = path.slice(${routes.length+1}, tail);
	tree.ingest(url, modules[path] as RouteModule<any>);
}

export function Dynamic<T extends Record<string, string>>(props: {
	params: T,
	loader: (params: T, ctx: GenericContext) => Promise<JSX.Element>
	children?: JSX.Element
}): JSX.Element {
	const path = RegisterDynamic(props.loader);

	const query = new URLSearchParams();
	for (const key in props.params) query.set(key, props.params[key]);
	const url = path + query.toString();

	return <div
		hx-get={url}
		hx-trigger="load"
		hx-swap="outerHTML transition:true"
		style={{ display: "contents" }}
	>{props.children ? props.children : ""}</div>
}

let headCache: JSX.Element | null = null;
const isProduction = process.env.NODE_ENV === "production";
const clientEntry = await GetClientEntryURL();
export function Scripts() {
	if (headCache) return headCache;

	const res = <>
		<link href={GetSheetUrl()} rel="stylesheet"></link>
		{ isProduction ? "" : <script type="module" src="/@vite/client"></script> }
		<script type="module" src={clientEntry}></script>
		<script src={GetMountUrl()}></script>
	</>;

	if (isProduction) headCache = res;
	return res;
}`);


if (config.client) {
	console.info("Building client islands");
	await GenerateClient(config.client, true);
}