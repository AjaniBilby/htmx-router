import { GenericContext, text } from "htmx-router";

export function loader({ headers }: GenericContext) {
	headers.set("Cache-Control", "public, max-age=999999");
	return text("", { headers });
}