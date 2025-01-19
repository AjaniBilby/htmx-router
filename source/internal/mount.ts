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

	type MountRequest = [string, Element, string];
	const mountRequests = new Array<MountRequest>();
	function RequestMount(funcName: string, json: string) {
		const elm = document.currentScript!.parentElement!;
		if (elm.hasAttribute("mounted")) return;
		if (!document.body.contains(elm)) return;

		mountRequests.push([funcName, elm, json]);
	}

	function Mount([ funcName, element, json ]: MountRequest) {
		console.info("hydrating", funcName, "into", element);
		const func = global.CLIENT[funcName];
		if (!func) throw new Error(`Component ${funcName} is missing from client manifest`);
		func(element, json);
		element.setAttribute("component", funcName);
		element.setAttribute("mounted", "yes");
	}

	function MountAll() {
		if (!global.CLIENT) throw new Error("Client manifest missing");
		if (mountRequests.length < 1) return;

		for (const request of mountRequests) {
			if (!document.body.contains(request[1])) continue;
			Mount(request);
		}
		mountRequests.length = 0;
	}

	function MountStep() {
		let request = mountRequests.shift();
		while (request && !document.body.contains(request[1])) request = mountRequests.shift();
		if (!request) {
			console.warn("No more pending mount requests");
			return;
		}

		Mount(request);
	}

	function Freeze() {
		localStorage.setItem(freezeKey, "frozen");
		window.location.reload();
	}

	function Unfreeze() {
		localStorage.removeItem(freezeKey);
		window.location.reload();
	}

	const freezeKey = "htmx-mount-freeze";
	if (localStorage.getItem(freezeKey)) {
		const ok = confirm("Client mounting is frozen, do you want to unfreeze");
		if (ok) Unfreeze();
	} else {
		document.addEventListener("DOMContentLoaded", MountAll);
		document.addEventListener("htmx:load", MountAll);
	}

	return {
		mountParentWith: RequestMount,
		mount: {
			freeze: Freeze,
			unfreeze: Unfreeze,
			step: MountStep
		},
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

	ctx.headers.set("Content-Type", "text/javascript");
	ctx.headers.set("Cache-Control", "public, max-age=604800");

	return new Response(script, { headers: ctx.headers });
}