import type http from "node:http";

import { RenderArgs } from "./render-args";

export type Outlet = () => Promise<string>;
export type CatchFunction  = (routeName: string, args: RenderArgs, err: ErrorResponse) => Promise<string>;
export type RenderFunction = (routeName: string, args: RenderArgs) => Promise<string>;
export type AuthFunction   = (args: RenderArgs) => Promise<string>;
export type RouteModule = {
	Render?:     RenderFunction;
	CatchError?: CatchFunction;
	Auth?:       AuthFunction;
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
	data : string | Buffer | Uint8Array;

	constructor(data: string | Buffer | Uint8Array) {
		this.data = data;
	}
}