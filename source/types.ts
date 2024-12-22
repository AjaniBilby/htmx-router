import { ParameterShaper } from "~/util/parameters.js";
import { RouteContext } from "~/router.js";

export type CatchFunction<T> = (args: T, err: unknown) => Promise<Response | JSX.Element>;
export type RenderFunction<T> = (args: T) => Promise<Response | JSX.Element | null>;

export type RouteModule<T extends ParameterShaper> = {
	parameters?: T;
	loader?:     RenderFunction<RouteContext<T>>;
	action?:     RenderFunction<RouteContext<T>>;
	error?:      CatchFunction <RouteContext<T>>;
	route?:      (params: Record<string, string>) => string;
}