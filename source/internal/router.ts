import { ServerOnlyWarning } from "./util.js";
ServerOnlyWarning("internal/router");

import type { HtmxRouterServer } from "./request/server.js";
import { ParameterPrelude, ParameterShaper } from '../util/parameters.js';
import { RouteContext } from "../router.js";
import { RequestTimer } from "../timer.js";
import { Cookies } from '../cookies.js';

type Rendered = Response | BodyInit;

export class GenericContext {
	request: Request;
	headers: Headers; // response headers
	cookie: Cookies;
	params: { [key: string]: string };
	timer: RequestTimer;
	url: URL;

	#server: HtmxRouterServer;

	constructor(request: GenericContext["request"], url: GenericContext["url"], scope: HtmxRouterServer) {
		this.#server = scope;

		this.cookie  = new Cookies(request.headers.get("cookie"));
		this.headers = new Headers();
		this.request = request;
		this.params  = {};
		this.url     = url;
		this.timer   = new RequestTimer(scope.timers);

		if (scope.poweredBy) this.headers.set("X-Powered-By", "htmx-router");

		this.headers.set("x-powered-by", "htmx-router");
		this.headers.set("content-type", "text/html");
	}

	render (res: JSX.Element, headers: Headers): Promise<Rendered> | Rendered {
		this.timer.checkpoint("render");
		return this.#server.render(res, headers);
	}

	finalize(res: Response) {
		this.timer.writeTo(res.headers);
		return res;
	}

	shape<T extends ParameterShaper>(shape: T, path: string) {
		return new RouteContext(this, this.params as ParameterPrelude<T>, shape, path);
	}
}