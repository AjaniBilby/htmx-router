import { HtmxRouterServer, Config } from "./internal/request/server.js";

export function createHtmxServer(config: Config): HtmxRouterServer {
	return new HtmxRouterServer(config);
}