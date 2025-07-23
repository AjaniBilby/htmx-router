/**
 * Tracks timing checkpoints during request processing and writes performance
 * metrics to HTTP response headers.
 *
 * **HTTP Headers Generated:**
 * - `X-Time-Total`: Total request processing time in milliseconds
 * - `X-Time-{name}`: Duration for each checkpoint in milliseconds
 *
 * **Default Checkpoints:**
 * - `route`: Automatically created when timer is enabled (marks start of request)
 * - `render`: Automatically triggered when JSX gets rendered to a string
 */
export class RequestTimer {
	#checkpoints: Checkpoint[] | null;

	constructor (enabled: boolean) {
		if (!enabled) {
			this.#checkpoints = null;
			return;
		}

		this.#checkpoints = [];
		this.checkpoint("route");
	}

	/**
	 * Creates a timing checkpoint with the given name.
	 *
	 * Each checkpoint measures the time elapsed since the previous checkpoint.
	 * The resulting duration is written to the `X-Time-{name}` HTTP header.
	 *
	 * **Common Usage Pattern:**
	 * ```ts
	 * timer.checkpoint("auth");        // -> X-Time-auth: time from auth to fetch
	 * timer.checkpoint("fetch");       // -> X-Time-auth: time from fetch to transform
	 * timer.checkpoint("transform");   // -> X-Time-fetch: time from transform to render
	 * // render checkpoint added automatically during JSX rendering
	 * //                              // -> X-Time-render: time from render to response
	 * ```
	 *
	 * @param name - The name of the checkpoint (used in the HTTP header)
	 *
	 * @example
	 * ```ts
	 * export async function loader({ timer }: RouteContext) {
	 *   timer.checkpoint("auth");
	 *   await authenticate();
	 *
	 *   timer.checkpoint("fetch");
	 *   const data = await fetchData();
	 *
	 *   return json(data);
	 * }
	 * ```
	 */
	checkpoint(name: string) {
		if (this.#checkpoints === null) return;
		this.#checkpoints.push(new Checkpoint(name));
	}

	writeTo(headers: Headers) {
		if (this.#checkpoints === null) return;
		if (this.#checkpoints.length < 1) return;
		const end = Date.now();

		const first = this.#checkpoints[0];
		headers.set(`X-Time-Total`, String(end-first.time));

		const limit = this.#checkpoints.length-1;
		for (let i=0; i<limit; i++) {
			const c = this.#checkpoints[i];
			const n = this.#checkpoints[i+1];

			headers.set(`X-Time-${c.name}`, String(n.time-c.time));
		}

		const last = this.#checkpoints[limit];
		headers.set(`X-Time-${last.name}`, String(end-last.time));
	}
}

class Checkpoint {
	readonly time: number;
	readonly name: string;

	constructor (name: string) {
		this.time = Date.now();
		this.name = name;
	}
}