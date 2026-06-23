import crypto from 'node:crypto';

type ResourceOptions = { etag?: string, lastModified?: Date, revalidate?: number, public?: boolean };


/**
 * @deprecated use {@link AssertResourceFresh} instead
 */
export function AssertETagStale(request: Request, headers: Headers, etag: string, options?: { revalidate?: number, public?: boolean }): void {
	return AssertResourceFresh(request, headers, { etag, ...options });
}

/**
 * Asserts the freshness of a resource using ETag or Last-Modified headers to manage conditional HTTP requests.
 * This function acts as a guard: it evaluates the request against the provided resource state and
 * throws a Response to intercept the execution flow if the cache state requires it.
 *
 * @param {Request}  request               - The incoming HTTP request object
 * @param {Headers}  headers               - The response headers object to modify
 * @param {Object}   options               - Configuration for freshness validation
 * @param {string}  [options.etag]         - The current ETag value for the resource (do not quote)
 * @param {Date}    [options.lastModified] - The last modified timestamp of the resource
 * @param {number}  [options.revalidate]   - Client must revalidate their cache at this interval in seconds
 * @param {boolean} [options.public]       - Cache visibility scope:
 *   - true: Can be cached by any cache (e.g., Cloudflare)
 *   - false: Can only be cached by private caches (e.g., browser)
 *
 * @throws {Response} `304 Not Modified`
 *   For `GET` or `HEAD` requests when the client's cache is still valid (stale state).
 *
 * @throws {Response} `412 Precondition Failed`
 *   - When the client's conditional headers do not match the current resource state.
 *   - For non-idempotent methods (`POST`, `PUT`, `PATCH`, `DELETE`) when the resource state is stale.
 *
 * @returns {void} If the resource is fresh or the request is valid, allows execution to continue.
 *
 * @example
 * Basic usage with ETag
 * ```ts
 * AssertResourceFresh(request, headers, { etag: "v1.2.3" });
 * ```
 *
 * @example
 * Usage with Last-Modified and caching options
 * ```ts
 * AssertResourceFresh(request, headers, {
 *   lastModified: new Date("2026-01-01T00:00:00Z"),
 *   revalidate: 3600,
 *   public: true
 * });
 * ```
 *
 * @example
 * Usage in a handler function
 * ```ts
 * async function handleRequest(request, headers) {
 *   const data = await fetchData();
 *   const etag = GenerateEtag(data);
 *
 *   // Will throw 304 if the client's cache is still valid
 *   // Or throw 412 if preconditions fail
 *   AssertResourceFresh(request, headers, { etag });
 *
 *   // This code only runs if the client needs updated content
 *   return new Response(JSON.stringify(data), { headers });
 * }
 * ```
 *
 * @see {@link GetResourceState} For the detailed breakdown of the underlying state logic
 */
export function AssertResourceFresh(request: Request, headers: Headers, options: { etag?: string, lastModified?: Date, revalidate?: number, public?: boolean }): void {
	const state = GetResourceState(request, headers, options);

	function PreconditionFailed() {
		headers.set("X-Caught", "true");
		throw new Response(null, { headers, status: 412, statusText: 'Precondition Failed' });
	}

	function Stale() {
		headers.set("X-Caught", "true");
		throw new Response(null, { headers, status: 304, statusText: 'Not Modified' });
	}

	if (request.method === 'GET' || request.method === 'HEAD') {
		switch (state) {
			case 'PRECONDITION FAILED': return PreconditionFailed();
			case 'STALE'              : return Stale();
			case 'FRESH'              : return; // continue with response generation
		}
	} else {
		switch (state) {
			case 'PRECONDITION FAILED': return PreconditionFailed();
			case 'STALE'              : return PreconditionFailed(); // always treat as pre-condition on post/patch/put/delete
			case 'FRESH'              : return; // continue with response generation
		}
	}
}

/**
 * A predicate function that checks if the resource is "fresh" (i.e., it has been
 * updated or changed since the client's last cached version).
 *
 * Use this to determine if you need to proceed with generating a full response
 * or if the client can continue using their current cached version.
 *
 * @param {Request}         request - The incoming HTTP request object
 * @param {Headers}         headers - The response headers object
 * @param {ResourceOptions} options - The current metadata of the resource (ETag, Last-Modified, etc.)
 *
 * @returns {boolean} `true` if the resource is fresh (has changed and needs to be sent),
 *   `false` if the resource is stale (client's cache is still valid) or a precondition has failed.
 *
 * @example
 * Check if we need to send new data
 * ```ts
 * if (IsResourceFresh(request, headers, { etag: currentEtag })) {
 *   return new Response(JSON.stringify(data), { headers });
 * } else {
 *   // The resource is stale (client has it) or preconditions failed
 *   // Handle accordingly (e.g., return 304 or 412)
 * }
 * ```
 *
 * @example
 * Using it with more complex options
 * ```ts
 * const options = {
 *   etag: "v2",
 *   revalidate: 300,
 *   public: true
 * };
 *
 * if (IsResourceFresh(request, headers, options)) {
 *   // Generate full response...
 * }
 * ```
 *
 * @see {@link GetResourceState} For the detailed breakdown of the underlying state logic.
 */
export function IsResourceFresh(request: Request, headers: Headers, options: ResourceOptions): boolean {
	const state = GetResourceState(request, headers, options);
	return state === 'FRESH';
}






/**
 * Evaluates the freshness and precondition status of a resource by comparing
 * the incoming request's conditional headers against the current resource metadata.
 *
 * This function performs the core logic to determine if a client's cached version
 * is still valid, needs updating, or if a conditional request (like `If-Match`)
 * has failed.
 *
 * @param {Request}  request               - The incoming HTTP request object containing conditional headers
 * @param {Headers}  headers               - The response headers object to be used during evaluation
 * @param {Object}   options               - The current metadata of the resource being requested
 * @param {string}  [options.etag]         - The current ETag value of the resource
 * @param {Date}    [options.lastModified] - The last modified timestamp of the resource
 * @param {number}  [options.revalidate]   - The revalidation interval in seconds
 * @param {boolean} [options.public]       - Cache visibility scope:
 *   - true: Can be cached by any cache (e.g., Cloudflare)
 *   - false: Can only be cached by private caches (e.g., browser)
 *
 * @returns {'FRESH' | 'STALE' | 'PRECONDITION FAILED'} The calculated state:
 *   - `'FRESH'`: The client's cache is outdated; new content should be sent.
 *   - `'STALE'`: The client's cache is valid; no update is required.
 *   - `'PRECONDITION FAILED'`: The client's conditional headers (e.g., `If-Match`) did not match the current resource state.
 *
 * @example
 * Manual state checking
 * ```ts
 * const state = GetResourceState(request, responseHeaders, { etag: "v1.2.3" });
 *
 * if (state === 'FRESH') {
 *   console.log("Client needs new data");
 * } else if (state === 'PRECONDITION FAILED') {
 *   console.log("Client's precondition check failed");
 * }
 * ```
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/ETag      | ETag - MDN Web Docs}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/If-None-Match       | If-None-Match - MDN Web Docs}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/If-Match            | If-Match - MDN Web Docs}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/If-Modified-Since   | If-Modified-Since - MDN Web Docs}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/If-Unmodified-Since | If-Unmodified-Since - MDN Web Docs}
 */
export function GetResourceState(request: Request, headers: Headers, options: { etag?: string, lastModified?: Date, revalidate?: number, public?: boolean }): 'FRESH' | 'STALE' | 'PRECONDITION FAILED' {
	headers.delete("Cache-Control"); // clear any defaults

	// only apply cache control if something was actually provided in the options
	if (options.etag || options.lastModified || options.public !== undefined || options.revalidate !== undefined) {
		// default to private, because it's the slightly less worse of the two potential foot guns
		if (options.public) headers.append("Cache-Control", "public");
		else headers.append("Cache-Control", "private");

		if (options.revalidate !== undefined) headers.append("Cache-Control", `max-age=${options.revalidate}`);
	}

	if (options.etag)          headers.append("Cache-Control", "must-revalidate");
	if (options?.lastModified) headers.append("Last-Modified", options.lastModified.toUTCString());

	if (options.etag) {
		SetETag(headers, options.etag);
		const match = CheckETag(request, options.etag);
		if (match) {
			if (match.some === false) return 'PRECONDITION FAILED';
			//  match.some === true,  no-op still check dates
			if (match.none === false) return 'STALE';
			//  match.none === true,  no-op still check dates
		}
	}

	if (options?.lastModified) {
		// HTTP dates only have second precision
		function StripMs(time: number): number {
			return Math.floor(time / 1000) * 1000;
		}

		const actual = StripMs(options.lastModified.getTime());
		if (isNaN(actual)) return 'FRESH';

		const modified = request.headers.get('If-Modified-Since');
		if (modified) {
			const expected = StripMs(new Date(modified).getTime());
			if (!isNaN(expected) && actual <= expected) return 'STALE';
		}

		const unmodified = request.headers.get('If-Unmodified-Since');
		if (unmodified) {
			const expected = StripMs(new Date(unmodified).getTime());
			if (!isNaN(expected) && actual > expected) return 'PRECONDITION FAILED';
		}
	}

	return 'FRESH';
}



/**
 * Generates a deterministic ETag (Entity Tag) for various data types.
 *
 * The generation strategy varies based on the input type to balance performance and collision resistance:
 * - **Dates & Numbers**: Uses a lightweight base-36 encoding for speed.
 * - **Arrays**: Joins elements with `:` and returns the string if shorter than the hash would; otherwise, hashes the result.
 * - **Strings, Uint8Arrays, & ArrayBuffers**: Produces a SHA-256 hex digest.
 *
 * @param {string | Uint8Array | ArrayBuffer | Date | number | number[]} data - The content to represent.
 *
 * @returns {Promise<string>} A unique string identifier:
 *   - A base-36 string (for `Date` and `number`).
 *   - A colon-separated string (for short `number[]`).
 *   - A hex-encoded SHA-256 hash (for strings, buffers, or long arrays).
 *
 * @example
 * Generating an ETag for a Date (Base-36)
 * ```ts
 * const dateEtag = await GenerateETag(new Date());
 * ```
 *
 * @example
 * Generating an ETag for a number (Base-36)
 * ```ts
 * const numEtag = await GenerateETag(12345);
 * ```
 *
 * @example
 * Generating an ETag for a large string (SHA-256 Hash)
 * ```ts
 * const content = "Large payload...";
 * const stringEtag = await GenerateETag(content);
 * ```
 *
 * @throws {Error} If the cryptographic operation fails.
 */
export async function GenerateETag(data: string | Uint8Array | ArrayBuffer | Date | Number | Number[]): Promise<string> {
	if (data instanceof Date) return data.getTime().toString(36);
	if (typeof data === 'number') return data.toString(36);

	if (Array.isArray(data)) {
		data = data.join(':');
		if (data.length < 64) return data;
	}

	let view: ArrayBuffer;
	if (typeof data === 'string') {
		view = new TextEncoder().encode(data).buffer as ArrayBuffer;
	} else if (data instanceof Uint8Array) {
		view = data.buffer as ArrayBuffer;
	} else {
		view = data as ArrayBuffer;
	}

	const hash = await crypto.subtle.digest('SHA-256', view);
	const chars = [];
	for (const byte of new Uint8Array(hash)) chars.push(byte.toString(16).padStart(2, '0'));
	return chars.join('');
}

/**
 * Sets the `ETag` header on the provided `Headers` object.
 *
 * This utility ensures the ETag is compliant with HTTP standards and safe for transport by:
 * 1. Trimming leading/trailing whitespace.
 * 2. Applying URI encoding to safely handle special characters.
 * 3. Wrapping the resulting value in double quotes as required by RFC standards.
 *
 * @param {Headers} headers - The response headers object to modify.
 * @param {string} etag - The raw ETag value (e.g., a hash or a version string).
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/ETag      | ETag - MDN Web Docs}
 */
export function SetETag(headers: Headers, etag: string): void {
	etag = encodeURIComponent(etag.trim()); // safely handle any special characters
	headers.set("ETag", `"${etag}"`);
}





function GetETagRules(input: Request          ): { some?: string, none?: string };
function GetETagRules(input:           Headers): { some?: string, none?: string };
function GetETagRules(input: Request | Headers): { some?: string, none?: string } {
	const  target = input instanceof Request ? input.headers : input;
	const  some = target.get("if-match")     ?.trim();
	const  none = target.get("if-none-match")?.trim();

	return { some, none };
}

type ETagMatch = { valid: boolean, some?: boolean; none?: boolean };
function CheckETag(input: Request | Headers, etag: string): ETagMatch {
	const headers = input instanceof Request ? input.headers : input;
	return CheckRules(GetETagRules(headers), etag);
}


function CheckRules(rules: ReturnType<typeof GetETagRules>, etag: string): ETagMatch {
	if (!rules) return { some: undefined, none: undefined, valid: true };

	const some = rules.some ?  MatchRules(rules.some, etag) : undefined;
	const none = rules.none ? !MatchRules(rules.none, etag) : undefined;

	const vSome = some || some === undefined;
	const vNone = none || none === undefined;

	return { some, none, valid: vSome && vNone };
}


function MatchRules(header: string, etag: string): boolean {
	if (header === "*") return true;

	for (const term of header.split(/,\s*/)) {
		let s = term.startsWith('W/') ? 'W/'.length : 0;
		if (term.startsWith('"', s)) s++;

		const e = term.endsWith('"') ? term.length-1 : term.length;

		const tag = term.slice(s, e);
		if (etag === tag) return true;
	}

	return false;
}