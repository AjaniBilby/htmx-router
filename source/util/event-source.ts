
type Controller = ReadableStreamDefaultController;

/**
 * Helper for Server-Sent-Events, with auto close on SIGTERM and SIGHUP messages
 * Includes a keep alive empty packet sent every 30sec (because Chrome implodes at 120sec, and can be unreliable at 60sec)
 */
export class EventSourceConnection {
	private controller: Controller | null;
	private stream: ReadableStream;
	private timer: NodeJS.Timeout;

	readonly createdAt: number; // unix time

	constructor(request: Request, keepAlive = 30_000) {
		this.createdAt  = Date.now();
		this.controller = null;

		this.stream = new ReadableStream({
			start: (c) => { this.controller = c; },
			cancel: () => { this.close(); }
		});
		request.signal.addEventListener('abort', () => this.close());

		this.timer = setInterval(() => this.keepAlive(), keepAlive);
		register.push(this);
	}

	response() {
		const headers = new Headers();
		headers.set("Content-Type", "text/event-stream");
		headers.set("Transfer-Encoding", "chunked");
		headers.set("Connection", "keep-alive");
		headers.set("Keep-Alive", `timeout=120`);

		return new Response(this.stream, { headers });
	}

	private keepAlive() {
		if (!this.controller) return;

		try {
			this.controller.enqueue("\n\n");
		} catch (e) {
			console.error(e);
			this.close(); // unbind on failure
		}
	}

	send(type: string, data: string, timeStamp: number) {
		if (!this.controller) return false;

		try {
			this.controller.enqueue(`event: ${type}\ndata: [${data},${timeStamp}]\n\n`);
			return true;
		} catch (e) {
			console.error(e);
			this.close(); // unbind on failure
			return false;
		}
	}

	isClosed() {
		return this.controller === null;
	}

	close (unlink = true) {
		clearInterval(this.timer);
		if (!this.controller) return false;

		if (unlink) {
			const i = register.indexOf(this);
			if (i !== -1) register.splice(i, 1);
		}

		try {
			this.controller?.close();
		} catch (e) {
			console.error(e);
			this.controller = null;
			return false;
		}
		this.controller = null;

		return true;
	}
}


// Auto close all SSE streams when shutdown requested
// Without this graceful shutdowns will hang indefinitely
const register = new Array<EventSourceConnection>();
function CloseAll() {
	for (const connection of register) connection.close(false); // don't waste time unregistering
}

process.on('SIGTERM', CloseAll);
process.on('SIGHUP', CloseAll);