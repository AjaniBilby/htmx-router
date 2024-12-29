import { ServerOnlyWarning } from "./util.js";
ServerOnlyWarning("internal/router");

import { ParameterShaper } from '../util/parameters.js';
import { RouteContext } from "../router.js";
import { Cookies } from '../cookies.js';

export class GenericContext {
	request: Request;
	headers: Headers; // response headers
	cookie: Cookies;
	params: { [key: string]: string };
	url: URL;

	render: (res: JSX.Element) => Response;

	constructor(request: GenericContext["request"], url: GenericContext["url"], renderer: GenericContext["render"]) {
		this.cookie = new Cookies(request.headers);
		this.headers = new Headers();
		this.request = request;
		this.params = {};
		this.url = url;
		this.render = renderer;

		this.headers.set("x-powered-by", "htmx-router");
	}

	shape<T extends ParameterShaper>(shape: T) {
		return new RouteContext(this, shape);
	}
}