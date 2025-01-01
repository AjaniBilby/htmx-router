import { GenericContext } from "htmx-router";

import { RegisterKillFeed } from "~/model/kill-feed";

export function loader({ request }: GenericContext) {
	return RegisterKillFeed(request);
}