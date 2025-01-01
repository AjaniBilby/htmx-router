import { ServerOnlyWarning } from "./internal/util.js";
ServerOnlyWarning("event-source");

type Controller = ReadableStreamDefaultController;

/**
 * Helper for Server-Sent-Events, with auto close on SIGTERM and SIGHUP messages
 * Includes a keep alive empty packet sent every 30sec (because Chrome implodes at 120sec, and can be unreliable at 60sec)
 */
export class EventSource {
	private controller: Controller | null;
	private timer: NodeJS.Timeout | null;
	private state: number;

	readonly response: Response;
	readonly url: string; // just to make it polyfill

	constructor(request: Request, keepAlive = 30_000) {
		this.controller = null;
		this.state = 0;
		this.url = request.url;

		const stream = new ReadableStream({
			start: (c) => { this.controller = c; this.state = 1; },
			cancel: () => { this.close(); }
		});
		request.signal.addEventListener('abort', () => this.close());

		this.response = new Response(stream, { headers });

		this.timer = setInterval(() => this.keepAlive(), keepAlive);
		register.add(this);
	}

	get readyState() {
		return this.state;
	}

	private sendBytes(chunk: Uint8Array) {
		if (!this.controller) return false;

		try {
			this.controller.enqueue(chunk);
			return true;
		} catch (e) {
			console.error(e);
			this.close(); // unbind on failure
			return false;
		}
	}

	private sendText(chunk: string) {
		return this.sendBytes(encoder.encode(chunk));
	}

	private keepAlive() {
		return this.sendText("\n\n");
	}

	dispatch(type: string, data: string) {
		return this.sendText(`event: ${type}\ndata: ${data}\n\n`);
	}

	close (unlink = true) {
		if (this.state === 2) return false;

		if (unlink) register.delete(this);

		try {
			this.controller?.close();
		} catch (e) {
			console.error(e);
			this.controller = null;
			return false;
		}

		// Cleanup
		if (this.timer) clearInterval(this.timer);
		this.controller = null;
		this.state = 2;

		return true;
	}
}

export class EventSourceSet extends Set<EventSource> {
	/** Send update to all EventSources, auto closing failed dispatches */
	dispatch(type: string, data: string) {
		for (const stream of this) {
			if (stream.readyState === 0) continue; // skip initializing

			const success = stream.dispatch(type, data);
			if (!success) this.delete(stream);
		}
	}

	/** Cull all closed connections */
	cull() {
		for (const stream of this) {
			if (stream.readyState !== 2) continue;
			this.delete(stream);
		}
	}

	/** Close all connections */
	closeAll() {
		for (const stream of this) stream.close();
		this.clear();
	}
}





// global for easy reuse
const encoder = new TextEncoder();
const headers = new Headers();

// Chunked encoding with immediate forwarding by proxies (i.e. nginx)
headers.set("X-Accel-Buffering", "no");
headers.set("Transfer-Encoding", "chunked");
headers.set("Content-Type", "text/event-stream");

headers.set("Keep-Alive", "timeout=120"); // the maximum keep alive chrome shouldn't ignore
headers.set("Connection", "keep-alive");





// Auto close all SSE streams when shutdown requested
// Without this graceful shutdowns will hang indefinitely
const register = new EventSourceSet();
function CloseAll() {
	register.closeAll();
}
if (process) {
	process.on('SIGTERM', CloseAll);
	process.on('SIGTERM', CloseAll);
}