import { readFile } from "fs/promises";

export async function ReadConfig() {
	return JSON.parse(await readFile(process.argv[2] || "./htmx-config.json", "utf-8")) as {
		client?: {
			adapter: string,
			source:  string
		},
		router: {
			folder: string,
			output: string
		}
	};
}