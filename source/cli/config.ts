import { existsSync } from "fs";
import { readFile } from "fs/promises";

const DEFAULT: Config = {
	framework: "generic"
}

type Config = {
	framework: string,
	client?: {
		source: string,
		output: {
			server: string,
			client: string
		}
	}
	component?: Record<string, string>
}

export async function ReadConfig() {
	const path = process.argv[2] || "./htmx.config.json";
	if (!existsSync(path)) return DEFAULT;

	return JSON.parse(await readFile(path, "utf-8")) as Config;
}