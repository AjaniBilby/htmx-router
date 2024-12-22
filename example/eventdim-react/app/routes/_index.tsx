import { GenericContext } from "htmx-router";

import { KillFeedMessage } from "~/model/kill-feed";
import { GetUserID } from "~/model/user";

import { shell } from "./$";

export async function loader({ request, cookie }: GenericContext) {
	const userID = await GetUserID(request, cookie);

	if (userID) {
		KillFeedMessage("A user has entered the home page");
	}

	return shell(<div>
		<button hx-get="/auth/popup" hx-swap="afterend">Login</button>
	</div>, { title: "EventDim" })
}