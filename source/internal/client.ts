import { ServerOnlyWarning } from "./util.js";
ServerOnlyWarning("client-url");

import { readFile } from "fs/promises";

export async function GetClientEntryURL() {
	const config = JSON.parse(await readFile("./dist/client/.vite/manifest.json", "utf8"));
	for (const key in config) {
		const def = config[key];
		if (!def.isEntry) continue;

		return "/" + def.file;
	}
}