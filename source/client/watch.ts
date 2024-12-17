import { watch } from "fs";

import { GenerateClient } from "~/client/index.js";
import { ReadConfig } from "~/cli/config.js";

export async function WatchClient() {
	if (process.env.NODE_ENV === "production") {
		console.warn("Watching client islands is disabled in production");
		return;
	}

	const config = await ReadConfig();
	const client = config.client;
	if (!client) return;

	const rebuild = () => {
		console.info("Building client");
		GenerateClient(client).catch(console.error);
	}

	watch(client.source, rebuild);
	rebuild();
}