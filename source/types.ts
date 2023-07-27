import type http from "node:http";

export type Outlet = () => Promise<string>;
export type RenderFunction = (args: RenderArgs, Outlet: Outlet) => Promise<string>;
export type CatchFunction  = (args: RenderArgs, err: ErrorResponse) => Promise<string>;
export type RouteModule = {
	Render?:     RenderFunction;
	CatchError?: CatchFunction;
}

export class ErrorResponse {
	code   : number;
	status : string;
	data   : any;

	constructor(statusCode: number, statusMessage: string, data?: any) {
		this.code   = statusCode;
		this.status = statusMessage;
		this.data   = data || "";
	}
}

export class Redirect {
	location: string;

	constructor(location: string) {
		this.location = location;
	}

	run(res: http.ServerResponse) {
		res.statusCode = 302;
		res.setHeader('Location', this.location);
		return res.end();
	}
}

export class Override {
	data : BufferSource;

	constructor(data: BufferSource) {
		this.data = data;
	}
}


type MetaHTML = { [key: string]: string };

const attrRegex = /[A-z]+/;
function ValidateMetaHTML(val: MetaHTML) {
	for (const key in val) {
		if (!attrRegex.test(key)) return false;
	}

	return true;
}
function ValidateMetaHTMLs(val: MetaHTML[]) {
	for (const meta of val) {
		if (!ValidateMetaHTML(meta)) return false;
	}

	return true;
}

export class RenderArgs {
	req: http.IncomingMessage;
	res: http.ServerResponse;
	params: MetaHTML;
	url: URL;

	links: MetaHTML[];
	meta:  MetaHTML[];

	constructor(req: http.IncomingMessage, res: http.ServerResponse, url: URL) {
		this.req = req;
		this.res = res;
		this.url = url;
		this.params = {};

		this.links = [];
		this.meta  = [];
	}

	addLinks(links: MetaHTML[], override: boolean = false) {
		if (!ValidateMetaHTMLs(links))
			throw new Error(`Provided links have invalid attribute`);

		if (override) {
			this.links = links;
		} else {
			this.links.push(...links);
		}
	}

	addMeta(links: MetaHTML[], override: boolean = false) {
		if (!ValidateMetaHTMLs(links))
			throw new Error(`Provided links have invalid attribute`);

		if (override) {
			this.meta = links;
		} else {
			this.meta.push(...links);
		}
	}

	renderHeadHTML() {
		let out = "";

		for (const elm of this.links) {
			out += "<link";
			for (const attr in elm) {
				out += ` ${attr}="${elm[attr].replace(/"/g, "\\\"")}"`
			}
			out += "></link>";
		}

		for (const elm of this.meta) {
			out += "<meta";
			for (const attr in elm) {
				out += ` ${attr}="${elm[attr].replace(/"/g, "\\\"")}"`
			}
			out += "></meta>";
		}

		return out;
	}
}