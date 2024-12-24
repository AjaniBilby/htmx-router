import { readFile } from "fs/promises";

export async function GetClientEntryURL() {
	if (process.env.NODE_ENV !== "production") return "/app/entry.client.ts";

	const config = JSON.parse(await readFile("./dist/client/.vite/manifest.json", "utf8"));
	for (const key in config) {
		const def = config[key];
		if (!def.isEntry) continue;

		return "/" + def.file;
	}
}