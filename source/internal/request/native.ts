import { ServerOnlyWarning } from "../util.js";
ServerOnlyWarning("native-request");

import type { Config, RouterModule } from './index.js';
import type { RouteTree } from '../../router.js';
import { GenericContext } from "../router.js";
import { MakeStatus } from "../../status.js";

export function createRequestHandler(config: Config) {
	return async (req: Request) => {
		const mod: RouterModule = typeof config.build === "function" ? await config.build() : await config.build;
		return await Resolve(req, mod.tree, config);
	}
}

export async function Resolve(request: Request, tree: RouteTree, config: Config) {
	const ctx = new GenericContext(request, new URL(request.url), config.render);

	let response: Response;
	try {
		const x = ctx.url.pathname.slice(1);
		if (x.endsWith("/")) {
			ctx.headers.set("location", ctx.url.pathname.slice(0, -1) + ctx.url.search + ctx.url.hash);
			response = new Response("", MakeStatus("Permanent Redirect", { headers: ctx.headers }))
		} else {
			const fragments = x === "" ? [] : x.split("/");

			const res = await tree.resolve(fragments, ctx);
			response = res === null
				? new Response("No Route Found", MakeStatus("Not Found", ctx.headers))
				: res;
		}


		// Override with context headers
		if (response.headers !== ctx.headers) {
			for (const [key, value] of ctx.headers) {
				if (key === "content-type") continue;
				response.headers.set(key, value);
			}
		}
	} catch (e) {
		if (e instanceof Error) {
			console.error(e.stack);
			config.viteDevServer?.ssrFixStacktrace(e);
			response = new Response(e.message + "\n" + e.stack, { status: 500, statusText: "Internal Server Error" });
		} else {
			console.error(e);
			response = new Response(String(e), { status: 500, statusText: "Internal Server Error" });
		}
	}

	// Merge cookie changes
	const headers: { [key: string]: string | string[] } = Object.fromEntries(response.headers as any);

	const cookies = ctx.cookie.export();
	if (cookies.length > 0) {
		headers['set-cookie'] = cookies;
		response.headers.set("Set-Cookie", cookies[0]); // Response object doesn't support multi-header..[]
	}

	return { response, headers };
}