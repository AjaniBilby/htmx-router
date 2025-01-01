import { EventSourceConnection } from "htmx-router";
import { renderToString } from "react-dom/server";

import { Singleton } from "~/util/singleton";

// using a singleton so it survives restarts
const state = Singleton("kill-feed-pool", () => ({
	pool: new Array<EventSourceConnection>()
}));

export function RegisterKillFeed (request: Request) {
	const conn = new EventSourceConnection(request);
	state.pool.push(conn);

	return conn.response();
}

export function KillFeedMessage(msg: string) {
	const payload = renderToString(<div
		hx-get="/empty"
		hx-swap="outerHTML"
		hx-trigger="load delay:5s"
	>{msg}</div>)

	const next = [];
	for (const conn of state.pool) {
		const success = conn.send("update", payload);
		if (success) next.push(conn);
	}

	// eliminate dead connections
	state.pool = next;
}