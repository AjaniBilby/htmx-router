export interface CookieOptions {
	domain?: string | undefined;
	expires?: Date;
	httpOnly?: boolean;
	maxAge?: number;
	partitioned?: boolean;
	path?: string ;
	priority?: "low" | "medium" | "high";
	sameSite?: "lax" | "strict" | "none";
	secure?: boolean;
}

/**
 * Helper provided in the Generic and RouteContext which provides reading and updating cookies
 */
export class Cookies {
	private source: Document | string | null;
	private config: { [key: string]: CookieOptions };
	private map: { [key: string]: string } ;

	constructor(source?: Document | string | null) {
		this.source = source || null;
		this.config = {};
		this.map = {};
	}

	private parse () {
		if (this.source === null) return;

		const source = typeof this.source === "object" ? this.source.cookie : this.source;

		for (const line of source.split("; ")) {
			let [ name, value ] = line.split("=");
			name = decodeURIComponent(name);
			value = decodeURIComponent(value);

			this.map[name] = value;
		}

		// keep source it document
		if (typeof this.source === "string") this.source = null;
	}

	get(name: string) {
		this.parse();
		return this.map[name] || null;
	}

	entries(): Array<[string, string]> {
		this.parse();
		return Object.entries(this.map);
	}

	*[Symbol.iterator](): IterableIterator<[string, string]> {
		this.parse();
		for (const [key, value] of Object.entries(this.map)) {
			yield [key, value];
		}
	}

	has(name: string) {
		this.parse();
		return name in this.map;
	}

	set(name: string, value: string, options: CookieOptions = {}) {
		this.parse();
		options.path ||= "/";

		this.config[name] = options;
		this.map[name] = value;

		if (this.source !== null && typeof this.source === "object") {
			document.cookie = this.string(name);
		}
	}

	private string(name: string) {
		return encodeURIComponent(name)+"="+encodeURIComponent(this.map[name])+StringifyOptions(this.config[name]);;
	}

	unset(name: string) {
		this.parse();
		return this.set(name, "", { maxAge: 0 })
	}

	/** Creates the response headers required to make the changes done to these cookies */
	export() {
		const headers = new Array<string>();
		for (const name in this.config) headers.push(this.string(name));
		return headers;
	}
}

function StringifyOptions(options: CookieOptions) {
	let config = "";
	for (const opt in options) {
		const prop = opt === "maxAge"
			? "Max-Age"
			: opt[0].toUpperCase() + opt.slice(1);

		const raw = options[opt as keyof CookieOptions];
		if (raw === true) {
			config += `; ${prop}`;
			continue;
		}
		if (raw === false) continue;

		let value = String(raw);
		value = value[0].toUpperCase() + value.slice(1);

		config += `; ${prop}=${value}`;
	}

	return config;
}