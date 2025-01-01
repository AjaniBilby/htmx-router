import { ServerOnlyWarning } from "./util.js";
ServerOnlyWarning("client-mounter");

import { CutString, QuickHash } from "./util.js";
import { RouteContext } from "../index.js";

// this function simply exists so it can be stringified and written into the client js bundle
function ClientMounter() {
	const theme = {
		get: () => {
			return (localStorage.getItem("theme") || theme.infer()) as "light" | "dark";
		},
		infer: () => {
			const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			const current = prefersDark ? 'dark' : 'light';
			localStorage.setItem("theme", current);

			return current;
		},
		apply: () => {
			document.documentElement.setAttribute('data-theme', theme.get());
		},
		toggle: () => {
			if (theme.get() === "dark") localStorage.setItem("theme", "light");
			else localStorage.setItem("theme", "dark");

			theme.apply();
			return localStorage.getItem("theme") as "light" | "dark";
		}
	}

	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
		theme.infer();
		theme.apply();
	});
	theme.apply();

	const global = (window as any);

	const mountRequests = new Array<[string, Element, string]>();
	function RequestMount(funcName: string, json: string) {
		const elm = document.currentScript!.previousElementSibling!;
		if (elm.hasAttribute("mounted")) return;

		mountRequests.push([funcName, elm, json]);
	}

	function Mount() {
		if (mountRequests.length < 1) return;
		if (!global.CLIENT) throw new Error("Client manifest missing");

		for (const [ funcName, element, json ] of mountRequests) {
			console.info("hydrating", funcName, "into", element);
			const func = global.CLIENT[funcName];
			if (!func) throw new Error(`Component ${funcName} is missing from client manifest`);
			func(element, json);
			element.setAttribute("mounted", "yes");
		}
		mountRequests.length = 0;
	}

	document.addEventListener("DOMContentLoaded", Mount);
	document.addEventListener("htmx:load", Mount);

	return {
		mountAboveWith: RequestMount,
		theme
	}
};


const script = "window.Router = (function () {"
	+ CutString(ClientMounter.toString(), "{")[1]
	+ ")();";
const hash = QuickHash(script);

export function GetMountUrl() {
	return `/_/mount/${hash}.js`;
}



/**
 * RouteTree mounting point
 */
export const path = "_/mount/$hash";

export const parameters = {
	hash: String
}

export async function loader(ctx: RouteContext<typeof parameters>) {
	if (!ctx.params.hash) return null;

	// const build = GetSheet();
	if (!ctx.params.hash.startsWith(hash)) return null;

	const headers = new Headers();
	headers.set("Content-Type", "text/javascript");
	headers.set("Cache-Control", "public, max-age=604800");

	return new Response(script, { headers });
}