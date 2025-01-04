import { ServerOnlyWarning } from "../internal/util.js";
ServerOnlyWarning("bundle-splitter");

import type { UserConfig } from "vite";
import { init, parse } from "es-module-lexer";

await init;

type Plugin = NonNullable<UserConfig["plugins"]>[number];

const serverPattern = /\.server\.[tj]s(x)?/;
const clientPattern = /\.client\.[tj]s(x)?/;

export function BundleSplitter(): Plugin {
	return {
		name: "htmx-bundle-splitter",
		enforce: "pre",
		transform: (code, id, options) => {
			const ssr = options?.ssr || false;
			const pattern = ssr ? clientPattern : serverPattern;
			if (pattern.test(id)) return StubExports(code);

			if (ssr) {
				if (code.startsWith('"use client"')) return StubExports(code);
			} else {
				if (code.startsWith('"use server"')) return StubExports(code);
			}

			return code;
		}
	}
}

// A server only module may be imported into client code,
// But as long as it isn't used this shouldn't break the program.
// However JS will crash the import if the export name it's looking for isn't present.
// Even if it's never used.
// So we must place some stubs just in case
function StubExports (code: string) {
	const exports = parse(code)[1];

	return exports.map(x => x.n === "default"
		? "export default undefined;"
		: `export const ${x.n} = undefined;`
	).join("\n");
}