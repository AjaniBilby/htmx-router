import type { Plugin } from "vite";
import { resolve } from "path";

import { CompileManifest } from "../internal/compile/manifest.js";

type SupportedFramework = "react";

export function ClientIsland(framework: SupportedFramework): Plugin {
	const file = resolve("./app/manifest.tsx").replaceAll("\\", "/");

	return {
		name: "vite-plugin-htmx-client-island",
		enforce: "pre",
		transform: (code, id, options) => {
			if (id !== file) return code;

			return CompileManifest(framework, code, options?.ssr || false);
		}
	}
}