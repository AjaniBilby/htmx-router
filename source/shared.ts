export type RenderArgs = {
	request: Request,
	params: { [key: string]: string }
	url: URL
};

export type CatchFunction  = (args: RenderArgs, err: unknown) => Promise<Response | JSX.Element | null>;
export type RenderFunction = (args: RenderArgs) => Promise<Response | JSX.Element | null>;
export type RouteModule = {
	loader?:  RenderFunction;
	action?:  RenderFunction;
	error?:   CatchFunction;
}