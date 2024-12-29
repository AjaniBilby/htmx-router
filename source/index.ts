import type { ParameterShaper } from "./util/parameters.js";
import type { RouteContext } from "./router.js";

import { createRequestHandler } from "./internal/request/index.js";

export type RenderFunction<T> = (args: T) => Promise<Response | JSX.Element | null>;
export type CatchFunction<T> = (args: T, err: unknown) => Promise<Response | JSX.Element>;

export type RouteModule<T extends ParameterShaper> = {
	parameters?: T;
	loader?:     RenderFunction<RouteContext<T>>;
	action?:     RenderFunction<RouteContext<T>>;
	error?:      CatchFunction <RouteContext<T>>;
	route?:      (params: Record<string, string>) => string;
}

export type ClientIslandManifest<T> = {
	[K in keyof T]: ClientIsland<T[K]>;
};
type ClientIsland<T> = T extends (props: infer P) => JSX.Element
	? (props: P & { children?: JSX.Element }) => JSX.Element
	: T;


export { createRequestHandler, RouteContext };