import { ServerOnlyWarning } from "./util.js";
ServerOnlyWarning("internal/router");

import { ParameterPrelude, ParameterShaper } from '../util/parameters.js';
import { RouteContext } from "../router.js";
import { Cookies } from '../cookies.js';

type Rendered = Response | BodyInit;

export class GenericContext {
	request: Request;
	headers: Headers; // response headers
	cookie: Cookies;
	params: { [key: string]: string };
	url: URL;

	render: (res: JSX.Element, headers: Headers) => Promise<Rendered> | Rendered;

	constructor(request: GenericContext["request"], url: GenericContext["url"], renderer: GenericContext["render"]) {
		this.cookie  = new Cookies(request.headers.get("cookie"));
		this.headers = new Headers();
		this.request = request;
		this.params  = {};
		this.url     = url;
		this.render  = renderer;

		this.headers.set("x-powered-by", "htmx-router");
		this.headers.set("content-type", "text/html");
	}

	shape<T extends ParameterShaper>(shape: T, path: string) {
		return new RouteContext(this, this.params as ParameterPrelude<T>, shape, path);
	}
}