import { QuickHash } from "~/util/hash.js";
import { CutString } from "~/helper.js";

// this function simply exists so it can be stringified and written into the client js bundle
function ClientMounter() {
	const theme = {
		infer: () => {
			const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			const current = prefersDark ? 'dark' : 'light';
			localStorage.setItem("theme", current);

			return current;
		},
		apply: () => {
			const current = localStorage.getItem("theme") || theme.infer();
			document.documentElement.setAttribute('data-theme', current);
		},
		toggle: () => {
			const current = localStorage.getItem("theme") || theme.infer();
			if (current === "dark") localStorage.setItem("theme", "light");
			else localStorage.setItem("theme", "dark");

			theme.apply();
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
		mountRequests.push([funcName, document.currentScript!.previousElementSibling!, json]);
	}

	function Mount() {
		if (mountRequests.length < 1) return;
		if (!global.CLIENT) throw new Error("Client manifest missing");

		for (const [ funcName, element, json ] of mountRequests) {
			console.info("hydrating", funcName, "into", element);
			const func = global.CLIENT[funcName];
			if (!func) throw new Error(`Component ${funcName} is missing from client manifest`);
			func(element, json);
		}
		mountRequests.length = 0;
	}

	document.addEventListener("DOMContentLoaded", Mount);
	if (global.htmx) global.htmx.onLoad(Mount);

	return {
		mountAboveWith: RequestMount,
		theme
	}
};


const script = "window.Router = (function () {"
	+ CutString(ClientMounter.toString(), "{")[1]
	+ ")();";
const hash = QuickHash(script);

export function _resolve(fragments: string[]): Response | null {
	if (!fragments[2]) return null;

	// const build = GetSheet();
	if (!fragments[2].startsWith(hash)) return null;

	const headers = new Headers();
	headers.set("Content-Type", "text/javascript");
	headers.set("Cache-Control", "public, max-age=604800");

	return new Response(script, { headers });
}

export function GetMountUrl() {
	return `/_/mount/${hash}.js`;
}