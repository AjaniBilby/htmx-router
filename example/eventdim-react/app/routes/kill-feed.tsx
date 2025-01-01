import type { RouteContext } from "htmx-router/router";

import { RegisterKillFeed } from "~/model/kill-feed";

export function loader({ request }: RouteContext) {
	return RegisterKillFeed(request);
}