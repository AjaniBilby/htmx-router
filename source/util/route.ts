import { ServerOnlyWarning } from "../internal/util.js";
ServerOnlyWarning("route-path");

import { ParameterShaper } from "./parameters.js";

export function RoutePath<T extends ParameterShaper>() {
	const frags = new Array<string>();

	type Args<T extends ParameterShaper> = {
		[K in keyof T]: string;
	}
	return (params: Args<T>) => {
		const t = params as unknown;
		if (typeof t === "string") {
			Compile("/"+t, frags);
			return "";
		}

		return Parse(frags, params);
	}
}


const indexRoute = "/_index";
function Compile(url: string, into: Array<string>) {
	let cursor=0;
	let i=1;
	for (; i<url.length; i++) {
		if (url[i] !== "$") continue;
		if (url[i-1] !== "/") continue;

		let e = url.indexOf("/", i+1);
		if (e === -1) e = url.length;

		into.push(url.slice(cursor, i));
		into.push(url.slice(i, e));

		cursor=e;
		i=e-1;
	}

	// remainder
	if (cursor != i) into.push(url.slice(cursor));

	// remove _index from end if present
	const lastI = into.length-1;
	const last = into[lastI];
	if (last && last.endsWith(indexRoute)) {
		if (last.length === indexRoute.length) into.length--;
		else into[lastI] = last.slice(0, -indexRoute.length);
	}
}

function Parse(fragments: string[], params: Record<string, string>) {
	let out = "";

	for (const frag of fragments) {
		if (!frag.startsWith("$")) {
			out += frag;
			continue;
		}

		const key = frag.slice(1);
		const param = params[key];
		if (!param) throw new Error(`Missing ${key} parameter required for route`);

		out += param;
	}

	return out;
}