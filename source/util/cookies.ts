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

export class Cookies {
	private map: { [key: string]: string };
	private config: { [key: string]: CookieOptions };

	constructor(headers: Headers) {
		this.config = {};
		this.map = {};

		const cookie = headers.get("Cookie");
		if (!cookie) return;

		for (const line of cookie.split("; ")) {
			const [ name, value ] = line.split("=");
			this.map[name] = value;
		}
	}

	get(name: string) {
		return this.map[name] || null;
	}

	has(name: string) {
		return name in this.map;
	}

	set(name: string, value: string, options: CookieOptions = {}) {
		if (!options['path']) options['path'] = "/";

		this.config[name] = options;
		this.map[name] = value;
	}

	flash(name: string, value: string) {
		return this.set(name, value, { maxAge: 0 })
	}

	unset(name: string) {
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