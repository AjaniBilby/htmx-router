# Components

To bring any of these components into your project you must specify where they should be stored in your [`htmx.config.json`](../setup/config.md), then run `npx htmx-router` for it to generate the files.


```json title="htmx.config.json"
{
	"framework": "react",
	"component": {
		"defer":   "./app/component/defer.tsx",
		"head":    "./app/component/head.tsx",
		"scripts": "./app/component/scripts.tsx"
	}
}
```