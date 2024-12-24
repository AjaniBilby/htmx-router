import { Counter, Bar as Baz } from "~/component/counter";
import Foo from "~/component/foo";

// DO NOT EDIT BELOW THIS LINE
// hash: 9v5zr
import { StyleClass } from "htmx-router";
const island = new StyleClass("i", ".this{display:contents;}\n").name;

type FirstArg<T> = T extends (arg: infer U, ...args: any[]) => any ? U : never;
function mount(name: string, data: string, ssr?: JSX.Element) {
	return (<>
		<div className={island}>{ssr}</div>
		<script dangerouslySetInnerHTML={{__html: `Router.mountAboveWith('${name}', ${data})`}}></script>
	</>);
}

const Client = {
	Counter: function(props: FirstArg<typeof Counter> & { children?: JSX.Element }) {
		const { children, ...rest } = props;
		return mount("Counter", JSON.stringify(rest), children);
	},
	Baz: function(props: FirstArg<typeof Baz> & { children?: JSX.Element }) {
		const { children, ...rest } = props;
		return mount("Baz", JSON.stringify(rest), children);
	},
	Foo: function(props: FirstArg<typeof Foo> & { children?: JSX.Element }) {
		const { children, ...rest } = props;
		return mount("Foo", JSON.stringify(rest), children);
	},
}
export default Client;

import { __RebuildClient__ } from "htmx-router/bin/client/watch.js";
__RebuildClient__();