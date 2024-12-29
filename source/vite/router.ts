import type { Plugin } from "vite";

export function Router(): Plugin {
	const virtualModuleId = "virtual:htmx-router/dynamic.tsx";
  const resolvedVirtualModuleId = '\0' + virtualModuleId

	return {
		name: "vite-plugin-htmx-router",
		resolveId(id) {
			if (id === virtualModuleId) return resolvedVirtualModuleId;
		},
		load(id) {
			if (id !== resolvedVirtualModuleId) return;
			return source
		}
	}
}


const source = `export function Scripts() {
	if (headCache) return headCache;

	const res = <>
		<link href={GetSheetUrl()} rel="stylesheet"></link>
		{ isProduction ? "" : <script type="module" src="/@vite/client"></script> }
		<script type="module" src={clientEntry}></script>
		<script src={GetMountUrl()}></script>
	</>;

	if (isProduction) headCache = res;
	return res;
}`;