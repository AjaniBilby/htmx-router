import { Dynamic } from "~/router";
import { shell } from "./$";
import { randomNumber } from "./island-flashing";

export const parameters = {};

export async function loader() {
	return shell(<div style={{ maxWidth: "500px" }}>
		<p>If you don't want an island resetting on each page navigation</p>

		<blockquote id="retain" hx-preserve="true">
			<Dynamic params={{}} loader={randomNumber}><div></div></Dynamic>
		</blockquote>

		<a href="/island-flashing">Next</a>
	</div>, { title: "Island Preserve"});
}