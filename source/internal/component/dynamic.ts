const generic = `import { Parameterized, ParameterShaper } from "htmx-router/util/parameters";
import { DynamicReference } from "htmx-router/dynamic";
import { RenderFunction } from "htmx-router";

export function Dynamic<T extends ParameterShaper>(props: {
	params?: Parameterized<T>,
	loader:  RenderFunction<T>,
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