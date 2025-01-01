const generic = `import { Parameterized, ParameterShaper } from "htmx-router/util/parameters";
import { RenderFunction } from "htmx-router";
import { Deferral } from "htmx-router/defer";

export function Defer<T extends ParameterShaper>(props: {
	params?: Parameterized<T>,
	loader:  RenderFunction<T>,
	children?: JSX.Element
}): JSX.Element {
	return <div
		hx-get={Deferral(props.loader, props.params)}
		hx-trigger="load"
		hx-swap="outerHTML transition:true"
		style={{ display: "contents" }}
	>{props.children ? props.children : ""}</div>
}`;

export default {
	"*": generic
}