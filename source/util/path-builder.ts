import { ServerOnlyWarning } from "../internal/util.js";
ServerOnlyWarning("path-builder");

import { relative } from "path";

import { ParameterShaper } from "./parameters.js";


/*
// This feature is disabled because vite doesn't compile import.meta.url to the original url when making the SSR build
// Even though it's used statically in the routes

const parameters = {
	userID: Number
};

const urlPath = RoutePathBuilder<typeof parameters>(import.meta.url);

export function loader({ params }: RouteContext<typeof parameters>) {
	return <div>You are currently at {urlPath({ userID: params.userID.toString() })}</div>
}
*/


// This feature isn't particularly helpful for a router to refer to it's own URL
// But instead is useful because you could export this function
// Allowing other routes to use it, and thus if you move the file your imports will auto update by your LSP
// And thus so would your SSR rendered urls

function RoutePathBuilder<T extends ParameterShaper>(importUrl: string) {
	// file runs all imports before actually executing the route.tsx
	// so I have to do this BS instead of pre-compiling
	let compiled: string[] | null = null;

	return (params: Record<keyof T, string>) => {
		if (!compiled) {
			const root = (globalThis as any).HTMX_ROUTER_ROOT;
			let path = importUrl.slice("file:///".length);
			const raw = relative(root, path).replaceAll("\\", "/");
			const i = raw.lastIndexOf(".");
			compiled = raw.slice(0, i).split("/")
		}

		let path = "";
		for (const frag of compiled) {
			path += "/";
			if (frag[0] != "$") {
				path += frag;
				continue;
			}

			path += params[frag.slice(1)] || "_";
		}

		return path;
	}
}