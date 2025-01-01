import { ThemeSwitcher } from "~/component/client/theme-switcher";
import { Authenticate } from "~/component/client/authenticate";


// DO NOT EDIT BELOW THIS LINE
// hash: 1r1s9
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
	ThemeSwitcher: function(props: FirstArg<typeof ThemeSwitcher> & { children?: JSX.Element }) {
		const { children, ...rest } = props;
		return mount("ThemeSwitcher", JSON.stringify(rest), children);
	},
	Authenticate: function(props: FirstArg<typeof Authenticate> & { children?: JSX.Element }) {
		const { children, ...rest } = props;
		return mount("Authenticate", JSON.stringify(rest), children);
	},
}
export default Client;

import { __RebuildClient__ } from "htmx-router/bin/client/watch.js";
__RebuildClient__();