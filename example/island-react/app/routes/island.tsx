import type { RouteContext } from "htmx-router/router";

import { Dynamic } from "~/component/defer";
import { shell } from "./$";

export const parameters = {};

function timeout(ms: number) {
	return new Promise((res) => setTimeout(res, ms));
}

async function thing(props: {}, ctx: RouteContext): Promise<JSX.Element> {
	await timeout(2_000);
	return <>
		and filled later with dynamic content using skeletons for the pre-render

		<p>
			But I don't want my dynamic <a href="/island-preserve">flashing</a> every time the page changes
		</p>
	</>;
}

export async function loader() {
	return shell(<div style={{ maxWidth: "500px" }}>
		So have all of your content <Dynamic params={{}} loader={thing}>static</Dynamic>
	</div>, { title: "island"});
}