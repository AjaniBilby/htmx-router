import { HtmxRouterServer, Config } from "./internal/request/server.js";

export function createHtmxServer(config: Config) {
	return new HtmxRouterServer(config);
}