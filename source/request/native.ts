import { RouteContext, RouteTree } from '~/router.js';
import { Config, RouterModule } from '~/request/index.js';

export function createRequestHandler(config: Config) {
	return async (req: Request) => {
		try {
			const mod: RouterModule = typeof config.build === "function" ? await config.build() : await config.build;

			let { response, headers } = await Resolve(req, mod.tree, config);

			if (config.viteDevServer) {
				if (!headers["x-partial"] && response.headers.get("content-type")?.startsWith("text/html")) {
					const rendered = await config.viteDevServer.transformIndexHtml(req.url || "", await response.text());
					return new Response(rendered, {
						status:     response.status,
						statusText: response.statusText,
						headers:    response.headers,
					});
				}
			}

			return response;
		} catch (e) {
			if (e instanceof Error) {
				console.error(e.stack);
				config.viteDevServer?.ssrFixStacktrace(e);
				return new Response(e.message + "\n" + e.stack, { status: 500, statusText: "Internal Server Error"});
			} else {
				console.error(e);
				return new Response(String(e), { status: 500, statusText: "Internal Server Error"});
			}
		}
	}
}

export async function Resolve(request: Request, tree: RouteTree, config: Config) {
	const url = new URL(request.url);
	const ctx = new RouteContext(request, url, config.render);

	const x = ctx.url.pathname.endsWith("/") ? ctx.url.pathname.slice(0, -1) : ctx.url.pathname;
	const fragments = x.split("/").slice(1);

	let response = await tree.resolve(fragments, ctx);
	if (response === null) response = new Response("Not Found", { status: 404, statusText: "Not Found" });

	// Merge context headers
	response.headers.forEach((val, key) => {
		ctx.headers.set(key, val);
	});

	// Merge cookie changes
	const headers = Object.fromEntries(ctx.headers as any);

	const cookies = ctx.cookie.export();
	if (cookies.length > 0) {
		headers['set-cookie'] = cookies;
		response.headers.set("Set-Cookie", cookies[0]); // Response object doesn't support multi-header..[]
	}

	return { response, headers };
}