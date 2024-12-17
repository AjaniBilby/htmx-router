import { GenericContext } from "htmx-router";

import { Dynamic } from "~/router";
import { shell } from "./$";

export const parameters = {};

function timeout(ms: number) {
	return new Promise((res) => setTimeout(res, ms));
}

export async function randomNumber(props: {}, ctx: GenericContext): Promise<JSX.Element> {
	// You could also cache this in the browser cache
	// ctx.headers.set('Cache-Control', "private, max-age=120");

	await timeout(1_000);
	return <div style={{ marginBlock: "1em" }}>
		then wrap it in a <pre style={{ display: "inline-block" }}>hx-preserve</pre><br/>
		and keep your favorite random number {Math.floor(Math.random()*100)} safe
	</div>;
}

export async function loader() {
	return shell(<div style={{ maxWidth: "500px" }}>
		As long as you keep your ids consistent, hx-preserve will preserve your islands

		<blockquote id="retain" hx-preserve="true">
			<Dynamic params={{}} loader={randomNumber}><div></div></Dynamic>
		</blockquote>

		<p>
			But I need some client side content, can I have a <a href="/client-island">client-island</a>?
		</p>
	</div>, { title: "Island Flashing" });
}