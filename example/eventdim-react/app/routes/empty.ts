import type { RouteContext } from "htmx-router/router";
import { text } from "htmx-router/response";

export function loader({ headers }: RouteContext) {
	headers.set("Cache-Control", "public, max-age=999999");
	return text("", { headers });
}