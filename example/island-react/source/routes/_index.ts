import { RouteContext } from "htmx-router";

export const parameters = {};

export async function loader(ctx: RouteContext<typeof parameters>) {
	ctx.headers.set("Location", "/nothing");
	return new Response("", { status: 301, statusText: "Redirect"});
}