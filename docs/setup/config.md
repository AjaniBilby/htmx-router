# Config Setup <small>(optional)</small>

You can optionally define a `htmx.config.json` which needs to specify which framework you are using, and can then also define extra properties for [client islands](../islands/client.md), and for building the pre-made [htmx-router components](../components/index.md) for your framework.

The current structure of this config is as follows:
```ts title="htmx.config.json type"
type Config = {
	framework: "react" | "generic" | string,
	client?: {
		source: string,
		output: {
			server: string,
			client: string
		}
	}
	component?: Record<string, string>
}
```