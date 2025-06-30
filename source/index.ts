import type { ParameterShaper } from "./util/parameters.js";
import type { RouteContext } from "./router.js";

export type RenderFunction<T extends ParameterShaper = {}> = (ctx: RouteContext<T>) => Promise<Response | JSX.Element | null>;
export type CatchFunction<T extends ParameterShaper = {}> = (ctx: RouteContext<T>, err: unknown) => Promise<Response | JSX.Element>;

export type RouteModule<T extends ParameterShaper> = {
	parameters?: T;
	loader?:     RenderFunction<T>;
	action?:     RenderFunction<T>;
	error?:      CatchFunction <T>;
	route?:      (params: Record<string, string>) => string;
}

export type ClientIslandManifest<T> = {
	[K in keyof T]: ClientIsland<T[K]>;
};
type ClientIsland<T> = T extends (props: infer P) => JSX.Element
	? (props: P & { children?: JSX.Element }) => JSX.Element
	: T;


export { RouteContext };