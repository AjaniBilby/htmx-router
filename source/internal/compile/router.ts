export function CompileRouter(folder: string) {
	return `import { GenericContext, RouteTree } from "htmx-router/bin/router";
import { GetClientEntryURL } from 'htmx-router/bin/client/entry';
import { DynamicReference } from "htmx-router/bin/util/dynamic";
import { GetMountUrl } from 'htmx-router/bin/client/mount';
import { GetSheetUrl } from 'htmx-router/bin/util/css';
import { resolve } from "path";

const modules = import.meta.glob('/${folder}/**/*.{ts,tsx}', { eager: true });
console.log("${folder}");
console.log(modules);

export const tree = new RouteTree();
for (const path in modules) {
	const mod = modules[path];
	const tail = path.lastIndexOf(".");
	const url = path.slice(${folder.length+1}, tail);
	tree.ingest(url, mod);
}`
}


/*
export function Dynamic<T extends Record<string, string>>(props: {
	params?: T,
	loader: (ctx: GenericContext, params?: T) => Promise<JSX.Element>
	children?: JSX.Element
}): JSX.Element {
	return <div
		hx-get={DynamicReference(props.loader, props.params)}
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
}
*/