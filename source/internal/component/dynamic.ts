const generic = `"use server";
import { DynamicReference } from "htmx-router/dynamic";
import { GenericContext } from "htmx-router/router";

export function Dynamic<T extends Record<string, string>>(props: {
	params?: T,
	loader: (ctx: GenericContext, params?: T) => Promise<JSX.Element>
	children?: JSX.Element
}): JSX.Element {
	return <div
		hx-get={DynamicReference(props.loader, props.params)}
		hx-trigger="load"
		hx-swap="outerHTML transition:true"
		style={{ display: "contents" }}
	>{props.children ? props.children : ""}</div>
}`;

export default {
	"*": generic
}