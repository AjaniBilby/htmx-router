import { Counter } from "~/component/counter";

// DO NOT EDIT BELOW THIS LINE
// hash: zw8ey
type FirstArg<T> = T extends (arg: infer U, ...args: any[]) => any ? U : never;
function mount(name: string, data: string, ssr?: JSX.Element) {
	return (<>
		<div style={{ display: "contents" }}>{ssr}</div>
		<script>{`Router.mountAboveWith("${name}", JSON.parse("${data}"))`}</script>
	</>);
}

const Client = {
	Counter: function(props: FirstArg<typeof Counter> & { children?: JSX.Element }) {
		const { children, ...rest } = props;
		return mount("Counter", JSON.stringify(rest), children);
	},
}
export default Client;

if (process.env.NODE_ENV !== "production") {
	(await import( "htmx-router/bin/client/watch.js")).WatchClient();
}