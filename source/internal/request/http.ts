import { ServerOnlyWarning } from "../util.js";
ServerOnlyWarning("http-request");

import type { IncomingMessage, ServerResponse } from "http";
import type { ViteDevServer } from "vite";

import type { RouteTree } from "../../router.js";
import { GenericContext } from "../router.js";
import { CreateRequest } from "./compatibility/node.js";
import { Resolve } from "./native.js";

type Config = {
	build: Promise<any> | (() => Promise<Record<string, any>>),
	viteDevServer: ViteDevServer | null,
	render: GenericContext["render"]
};

type RouterModule = { tree: RouteTree }


/**
 * @deprecated - use createServer().nodeAdaptor()
 */
export function createRequestHandler(config: Config) {
	return async (req: IncomingMessage, res: ServerResponse) => {
		try {
			const mod: RouterModule = typeof config.build === "function" ? await config.build() : await config.build;
			const request = CreateRequest(req);

			let { response, headers } = await Resolve(request, mod.tree, config);
			res.writeHead(response.status, headers);

			if (response.body instanceof ReadableStream) {
				const reader = response.body.getReader();
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					res.write(value); // `value` is a Uint8Array.
				}

				res.end();
			} else {
				const rendered = await response.text();
				res.end(rendered);
			}
		} catch (e) {
			res.statusCode = 500;
			if (e instanceof Error) {
				console.error(e.stack);
				config.viteDevServer?.ssrFixStacktrace(e);
				res.end(e.stack);
			} else {
				console.error(e);
				res.end(String(e));
			}
		}
	}
}