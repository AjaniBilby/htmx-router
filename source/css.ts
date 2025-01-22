import { RouteContext } from "./index.js";
import { QuickHash } from "./internal/util.js";

const classNamePattern = /^[a-zA-Z_][a-zA-Z0-9_-]*$/;

const registry = new Map<String, Style>();
let cache: { sheet: string, hash: string } | null = null;

/**
 * Create a new css class to be included in the sheet
 * Use .this as your class name in the source, and it will be replaced with a unique name
 */
export class Style {
	readonly name:  string; // unique name generated based on the original name and hash of the style
	readonly style: string; // the mutated source
	readonly hash:  string;

	constructor (name: string, style: string) {
		if (!name.match(classNamePattern)) throw new Error("Cannot use given name for CSS class");

		this.hash = QuickHash(style);
		this.name = `${name}-${this.hash}`;

		style = style.replaceAll(".this", "."+this.name);
		this.style = style;

		registry.set(this.name, this);
		cache = null;
	}

	toString() {
		return this.name;
	}
}

function BuildSheet() {
	let composite = "";
	let sheet = "";
	for (const [key, def] of registry) {
		composite += key;
		sheet += def.style;
	}

	const hash = QuickHash(composite);
	cache = { hash, sheet };

	return cache;
}

function GetSheet() {
	return cache || BuildSheet();
}

export function GetSheetUrl() {
	const sheet = GetSheet();
	return `/_/style/${sheet.hash}.css`;
}



/**
 * RouteTree mounting point
 */
export const path = "/_/style/$hash";

export const parameters = {
	hash: String
}

export async function loader(ctx: RouteContext<typeof parameters>) {
	const build = GetSheet();
	if (!ctx.params.hash.startsWith(build.hash)) return null;

	ctx.headers.set("Content-Type", "text/css");
	ctx.headers.set("Cache-Control", "public, max-age=604800");

	return new Response(build.sheet, { headers: ctx.headers });
}