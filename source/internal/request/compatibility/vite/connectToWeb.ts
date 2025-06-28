// Taken From: https://github.com/vikejs/vike-server/blob/7bcb7805fa39ef945adc73f4faf5c89a81f3f7ec/packages/vike-node/src/runtime/adapters/connectToWeb.ts

export { connectToWeb }

import type { IncomingMessage, ServerResponse } from 'node:http';
import { createServerResponse } from './createServerResponse.js';
import { flattenHeaders } from './header-utils.js';
import { Readable } from 'node:stream';

type NextFunction = (err?: unknown) => void
type ConnectMiddleware<
	PlatformRequest extends IncomingMessage = IncomingMessage,
	PlatformResponse extends ServerResponse = ServerResponse
> = (req: PlatformRequest, res: PlatformResponse, next: NextFunction) => void
type WebHandler = (request: Request) => Response | undefined | Promise<Response | undefined>

const statusCodesWithoutBody = [
	100, // Continue
	101, // Switching Protocols
	102, // Processing (WebDAV)
	103, // Early Hints
	204, // No Content
	205, // Reset Content
	304, // Not Modified
]

/**
 * Converts a Connect-style middleware to a web-compatible request handler.
 *
 * @param {ConnectMiddleware} handler - The Connect-style middleware function to be converted.
 * @returns {WebHandler} A function that handles web requests and returns a Response or undefined.
 */
function connectToWeb(handler: ConnectMiddleware): WebHandler {
	return async (request: Request): Promise<Response | undefined> => {
		const req = createIncomingMessage(request);
		const { res, onReadable } = createServerResponse(req);

		return new Promise<Response | undefined>((resolve, reject) => {
			onReadable(({ readable, headers, statusCode }) => {
				const responseBody = statusCodesWithoutBody.includes(statusCode)
					? null
					: (Readable.toWeb(readable) as ReadableStream)
				resolve(
					new Response(responseBody, {
						status: statusCode,
						headers: flattenHeaders(headers)
					})
				)
			})

			const next = (error?: unknown) => {
				if (error) reject(error instanceof Error ? error : new Error(String(error)));
				else resolve(undefined);
			}

			Promise.resolve(handler(req, res, next)).catch(next)
		})
	}
}

/**
 * Creates an IncomingMessage object from a web Request.
 *
 * @param {Request} request - The web Request object.
 * @returns {IncomingMessage} An IncomingMessage-like object compatible with Node.js HTTP module.
 */
function createIncomingMessage(request: Request): IncomingMessage {
	const parsedUrl = new URL(request.url, 'http://localhost')
	const pathnameAndQuery = (parsedUrl.pathname || '') + (parsedUrl.search || '')
	const body = request.body ? Readable.fromWeb(request.body as any) : Readable.from([])

	return Object.assign(body, {
		url: pathnameAndQuery,
		method: request.method,
		headers: Object.fromEntries(request.headers)
	}) as IncomingMessage
}