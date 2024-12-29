import { ServerOnlyWarning } from "../internal/util.js";
ServerOnlyWarning("bundle-splitter");

import type { UserConfig } from "vite";

type Plugin = NonNullable<UserConfig["plugins"]>[number];

const serverPattern = /\.server\.[tj]s(x)?/;
const clientPattern = /\.client\.[tj]s(x)?/;
const BLANK_MODULE = "export {};";

export function BundleSplitter(): Plugin {
	return {
		name: "htmx-bundle-splitter",
		enforce: "pre",
		transform: (code, id, options) => {
			const ssr = options?.ssr || false;
			const pattern = ssr ? clientPattern : serverPattern;
			if (pattern.test(id)) return BLANK_MODULE;

			if (ssr) {
				if (code.startsWith('"use client"')) return BLANK_MODULE;
			} else {
				if (code.startsWith('"use server"')) return BLANK_MODULE;
			}

			return code;
		}
	}
}