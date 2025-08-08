import { ServerOnlyWarning } from "./util.js";
ServerOnlyWarning("internal/router");

import type { HtmxRouterServer } from "./request/server.js";
import { ParameterPrelude, ParameterShaper } from '../util/parameters.js';
import { RouteContext } from "../router.js";
import { RequestTimer } from "../timer.js";
import { Cookies } from '../cookies.js';

export class GenericContext {
	readonly scope:   HtmxRouterServer;
	readonly request: Request;
	readonly headers: Headers; // response headers
	readonly cookie: Cookies;
	readonly params: { [key: string]: string };
	readonly timer: RequestTimer;
	readonly url: URL;

	constructor(request: GenericContext["request"], url: GenericContext["url"], scope: HtmxRouterServer) {
		this.cookie  = new Cookies(request.headers.get("cookie"));
		this.headers = new Headers(scope.headers);
		this.request = request;
		this.params  = {};
		this.url     = url;
		this.timer   = new RequestTimer(scope.timers);
		this.scope   = scope;
	}

	render(res: JSX.Element) {
		this.timer.checkpoint("render");
		return this.scope.render(res, this.headers, this);
	}

	finalize(res: Response) { this.timer.writeTo(res.headers); }

	shape<T extends ParameterShaper>(shape: T, path: string) {
		return new RouteContext(this, this.params as ParameterPrelude<T>, shape, path);
	}
}