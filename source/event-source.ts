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

type Render = (jsx: JSX.Element) => string;


/**
 * Helper for Server-Sent-Events, with auto close on SIGTERM and SIGHUP messages
 * Includes a keep alive empty packet sent every 30sec (because Chrome implodes at 120sec, and can be unreliable at 60sec)
 */
export class EventSource<JsxEnabled extends boolean = false> {
	#controller: ReadableStreamDefaultController | null;
	#signal: AbortSignal;
	#state: number;
	#render?: Render;

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

	constructor(request: Request, render: JsxEnabled extends true ? Render : undefined) {
		this.#controller = null;
		this.#state = EventSource.CONNECTING;
		this.#render = render;

		this.withCredentials = request.mode === "cors";
		this.url = request.url;

		this.createdAt = Date.now();
		this.#updatedAt = 0;

		// immediate prepare for abortion
		this.#signal = request.signal;
		const cancel = () => { this.close(); this.#signal.removeEventListener("abort", cancel) };
		this.#signal.addEventListener('abort', cancel);

		const start  = (c: ReadableStreamDefaultController<Uint8Array>) => { this.#controller = c; this.#state = EventSource.OPEN; };
		const stream = new ReadableStream<Uint8Array>({ start, cancel }, { highWaterMark: 0 });

		this.response = new Response(stream, { headers });

		keepAlive.add(this as EventSource<false>);
	}

	isAborted(): boolean { return this.#signal.aborted; }

	#sendBytes(chunk: Uint8Array, active: boolean): boolean {
		if (this.#state === EventSource.CLOSED) {
			const err = new Error(`Warn: Attempted to send data on closed stream for: ${this.url}`);
			console.warn(err);
		}

		if (this.isAborted()) {
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

	#sendText(chunk: string, simulated: boolean): boolean {
		return this.#sendBytes(encoder.encode(chunk), simulated);
	}

	/**
	 * For internal use only
	 * @deprecated
	 */
	_keepAlive(): boolean {
		return this.#sendText("\n\n", false);
	}

	dispatch(type: string, data: JsxEnabled extends true ? (JSX.Element | string) : string): boolean {
		let html;
		if (typeof data === "string") html = data;
		else {
			if (!this.#render) throw new Error(`Cannot render to JSX when no renderer provided during class initialization`);
			html = this.#render(data);
		}

		return this.#sendText(`event: ${type}\ndata: ${html}\n\n`, true);
	}

	close (): boolean {
		if (this.#controller) {
			try { this.#controller.close(); }
			catch (e) { console.error(e); }
			this.#controller = null;
		}

		// Cleanup
		keepAlive.delete(this as EventSource<false>);

		// was already closed
		if (this.#state === EventSource.CLOSED) return false;

		// Mark closed
		this.#state = EventSource.CLOSED;

		return true;
	}
}

export class EventSourceSet<JsxEnabled extends boolean = false> extends Set<EventSource<JsxEnabled>> {
	private onAbort: () => void;

	constructor(onAbort: () => void) {
		super();
		this.onAbort = () => this.cull();
	}

	add(stream: EventSource<JsxEnabled>) {
		super.add(stream);
		stream.addEventListener('abort', this.onAbort);
	}

	delete(stream: EventSource<JsxEnabled>) {
		super.delete(stream);
		stream.removeEventListener('abort', this.onAbort);
	}

	/**
	 * Send update to all EventSources, auto closing failed dispatches
	 * @returns number of successful sends
	 */
	dispatch(type: string, data: string): number {
		let count = 0;
		for (const stream of this) {
			if (stream.readyState !== EventSource.OPEN) continue; // skip closed

			const success = stream.dispatch(type, data);
			if (success) count++
			else this.delete(stream);
		}

		return count
	}

	/**
	 * Cull all closed connections
	 * @returns number of connections closed
	 */
	cull(): number {
		const count = this.size;
		for (const stream of this) {
			if (stream.readyState !== EventSource.CLOSED) continue;
			this.delete(stream);
		}

		return count;
	}

	/**
	 * Close all connections
	 * @returns number of connections closed
	 */
	closeAll(): number {
		const count = this.size;
		for (const stream of this) stream.close();
		this.clear();
		return count;
	}
}


type SharedEventSourceCacheRule = { limit: number, ttl: number }
	| { limit?: number, ttl:  number }
	| { limit:  number, ttl?: number };

/**
 * DO NOT USE: Experimental
 * @deprecated
 */
export class SharedEventSource<JsxEnabled extends boolean = false> {
	#pool: EventSourceSet<JsxEnabled>;
	#render?: Render;

	#cache: Record<string, { t: number, s: string }[]>;
	#rules: Record<string, SharedEventSourceCacheRule>;

	constructor (props: {
		cache?: Record<string, SharedEventSourceCacheRule>;
	} & (JsxEnabled extends true ? { render: Render } : {})) {
		this.#pool          = new EventSourceSet<JsxEnabled>();

		this.#render = (props as { render: Render })?.render || undefined;

		this.#cache = {};
		this.#rules = {};
	}

	create (request: Request): EventSource<JsxEnabled> {
		const source = new EventSource<JsxEnabled>(request, this.#render as any);

		const buffer = [];
		for (const name in this.#cache) buffer.push(...this.#cache[name].map(x => ({ t: name, x })));

		buffer.sort((a,b) => b.x.t - a.x.t);
		for (const e of buffer) source.dispatch(e.t, e.x.s);

		return source;
	}

	dispatch(type: string, data: JsxEnabled extends true ? (JSX.Element | string) : string): void {
		let html: string;
		if (typeof data === "string") html = data;
		else {
			if (!this.#render) throw new Error(`Cannot render to JSX when no renderer provided during class initialization`);
			html = this.#render(data);
		}

		this.#pool.dispatch(type, html);

		// Cache management
		const rule = this.#rules[type];
		if (!rule) return;
		const t = Date.now();
		this.#cache[type] ||= [];

		const queue = this.#cache[type];
		queue.push({ t, s: html });

		// Purge Cache
		let i = rule.limit ? Math.max(0, queue.length - rule.limit) : 0;
		if (rule.ttl) {
			const window = t - rule.ttl;
			for (; i<queue.length; i++) if (queue[i].t > window) break;
		}

		this.#cache[type] = queue.slice(i);
	}

	isEmpty (): boolean {
		return this.#pool.size < 1;
	}

	close (): void { this.#pool.closeAll(); }
}



// Auto close all SSE streams when shutdown requested
// Without this graceful shutdowns will hang indefinitely
const keepAlive = new Set<EventSource<false>>();
const interval = setInterval(() => {
	for (const e of keepAlive) {
		if (e.readyState === EventSource.CLOSED) {
			keepAlive.delete(e);
			continue;
		}
		e._keepAlive();
	}
}, 10_000);


function Shutdown () { clearInterval(interval); }
if (process) {
	process.on('SIGTERM', Shutdown);
	process.on('SIGHUP',  Shutdown);
}