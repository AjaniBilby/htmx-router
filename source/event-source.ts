import { ServerOnlyWarning } from "./internal/util.js";
ServerOnlyWarning("event-source");


// global for easy reuse
const encoder = new TextEncoder();
const headers = new Headers();
// Chunked encoding with immediate forwarding by proxies (i.e. nginx)
headers.set("X-Accel-Buffering", "no");
headers.set("Transfer-Encoding", "chunked");
headers.set("Content-Type", "text/event-stream");
// the maximum keep alive chrome shouldn't ignore
headers.set("Keep-Alive", "timeout=60");
headers.set("Connection", "keep-alive");


/**
 * Helper for Server-Sent-Events, with auto close on SIGTERM and SIGHUP messages
 * Includes a keep alive empty packet sent every 30sec (because Chrome implodes at 120sec, and can be unreliable at 60sec)
 */
export class EventSource {
	#controller: ReadableStreamDefaultController | null;
	#timer: NodeJS.Timeout | null;
	#state: number;

	readonly response: Response;

	readonly createdAt: number; // when was this source created
	#updatedAt: number;

	// just to make it polyfill
	readonly withCredentials: boolean;
	readonly url: string;

	constructor(request: Request, keepAlive = 30_000) {
		this.#controller = null;
		this.#state = EventSource.CONNECTING;
		this.url = request.url;
		this.withCredentials = request.mode === "cors";

		this.createdAt = Date.now();
		this.#updatedAt = 0;

		const stream = new ReadableStream({
			start: (c) => { this.#controller = c; this.#state = 1; },
			cancel: () => { this.close(); }
		});
		request.signal.addEventListener('abort', () => { this.close() });

		this.response = new Response(stream, { headers });

		this.#timer = setInterval(() => this.keepAlive(), keepAlive);
		register.add(this);
	}

	get readyState() {
		return this.#state;
	}
	get updatedAt () {
		return this.#updatedAt;
	}

	private sendBytes(chunk: Uint8Array, active: boolean) {
		if (!this.#controller) return false;

		try {
			this.#controller.enqueue(chunk);
			if (active) this.#updatedAt = Date.now();
			return true;
		} catch (e) {
			console.error(e);
			this.close(); // unbind on failure
			return false;
		}
	}

	private sendText(chunk: string, simulated: boolean) {
		return this.sendBytes(encoder.encode(chunk), simulated);
	}

	private keepAlive() {
		return this.sendText("\n\n", false);
	}

	dispatch(type: string, data: string) {
		return this.sendText(`event: ${type}\ndata: ${data}\n\n`, true);
	}

	close (unlink = true) {
		if (this.#state === 2) {
			this.#controller = null;
			return false;
		}

		if (unlink) register.delete(this);

		try {
			this.#controller?.close();
		} catch (e) {
			console.error(e);
			this.#controller = null;
			this.#state = 2;
			return false;
		}

		// Cleanup
		if (this.#timer) clearInterval(this.#timer);
		this.#controller = null;
		this.#state = 2;

		return true;
	}

	static CONNECTING = 0;
	static OPEN       = 1;
	static CLOSED     = 2;
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