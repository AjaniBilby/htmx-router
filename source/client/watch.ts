import { GenerateClient } from "~/client/index.js";
import { ReadConfig } from "~/cli/config.js";

export async function __RebuildClient__() {
	if (process.env.NODE_ENV === "production") return;

	const config = await ReadConfig();
	const client = config.client;
	if (!client) return;

	GenerateClient(client, false).catch(console.error);
}