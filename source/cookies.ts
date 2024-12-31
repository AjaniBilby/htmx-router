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
	private source: string | null;
	private config: { [key: string]: CookieOptions };
	private map: { [key: string]: string } ;

	constructor(source?: string | null) {
		this.source = source || null;
		this.config = {};
		this.map = {};
	}

	private parse () {
		if (this.source === null) return;

		for (const line of this.source.split("; ")) {
			const [ name, value ] = line.split("=");
			this.map[name] = value;
		}
		this.source = null;
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

		if (typeof document === "object") document.cookie = `${name}=${value}`;
	}

	unset(name: string) {
		this.parse();
		return this.set(name, "", { maxAge: 0 })
	}

	export() {
		const headers = new Array<string>();
		for (const name in this.config) {
			let config = "";
			for (const opt in this.config[name]) {
				const prop = opt === "maxAge"
					? "Max-Age"
					: opt[0].toUpperCase() + opt.slice(1);

				const raw = this.config[name][opt as keyof CookieOptions];
				if (raw === true) {
					config += `; ${prop}`;
					continue;
				}
				if (raw === false) continue;

				let value = String(raw);
				value = value[0].toUpperCase() + value.slice(1);

				config += `; ${prop}=${value}`;
			}

			const cookie = name+"="+this.map[name]+config+";";
			headers.push(cookie);
		}
		return headers;
	}
}