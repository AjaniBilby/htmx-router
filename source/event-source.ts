import { ServerOnlyWarning } from "./internal/util.js";
ServerOnlyWarning("event-source");


// global for easy reuse
const encoder = new TextEncoder();
const headers: ResponseInit["headers"] = {
	// Chunked encoding with immediate forwarding by proxies (i.e. nginx)
	"X-Accel-Buffering": "no",
	"Transfer-Encoding": "chunked",
	"Content-Type": "text/event-stream",
	// the maximum keep alive chrome shouldn't ignore
	"Keep-Alive": "timeout=60",
	"Connection": "keep-alive",
}


/**
 * Helper for Server-Sent-Events, with auto close on SIGTERM and SIGHUP messages
 * Includes a keep alive empty packet sent every 30sec (because Chrome implodes at 120sec, and can be unreliable at 60sec)
 */
export class EventSource {
	#controller: ReadableStreamDefaultController | null;
	#signal: AbortSignal;
	#timer: NodeJS.Timeout | null;
	#state: number;

	readonly response: Response;

	// activity timestamps, in unix time for minimal storage
	// since most use cases won't need the Date object anyway
	// no point waiting space and cycles creating it
	readonly createdAt: number;
	get updatedAt () { return this.#updatedAt; }
	#updatedAt: number;


	// just to make it polyfill
	readonly withCredentials: boolean;
	readonly url: string;

	get readyState() { return this.#state; }

	static CONNECTING = 0;
	static OPEN       = 1;
	static CLOSED     = 2;



	constructor(request: Request, keepAlive = 30_000) {
		this.#controller = null;
		this.#state = EventSource.CONNECTING;
		this.withCredentials = request.mode === "cors";
		this.url = request.url;

		this.createdAt = Date.now();
		this.#updatedAt = 0;

		// immediate prepare for abortion
		const cancel = () => { this.close(); };
		request.signal.addEventListener('abort', cancel);
		this.#signal = request.signal;

		const start  = (c: ReadableStreamDefaultController<Uint8Array>) => { this.#controller = c; this.#state = EventSource.OPEN; };
		const stream = new ReadableStream<Uint8Array>({ start, cancel }, { highWaterMark: 0 });

		this.response = new Response(stream, { headers });

		this.#timer = setInterval(() => this.keepAlive(), keepAlive);
		register.add(this);
	}

	private sendBytes(chunk: Uint8Array, active: boolean) {
		if (this.#state === EventSource.CLOSED) {
			const err = new Error(`Warn: Attempted to send data on closed stream for: ${this.url}`);
			console.warn(err);
		}

		if (this.#signal.aborted) {
			this.close();
			return false;
		}

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
		if (this.#controller) {
			try { this.#controller.close(); }
			catch (e) { console.error(e); }
			this.#controller = null;
		}

		// Cleanup
		if (this.#timer) clearInterval(this.#timer);
		if (unlink) register.delete(this);

		// was already closed
		if (this.#state === EventSource.CLOSED) return false;

		// Mark closed
		this.#state = EventSource.CLOSED;

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