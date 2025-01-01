# Vite Setup

The biggest requirement is a vite setup that generates SSR manifests so the server knows what client chunks are generated so it can reference them.

```ts title="vite.config.ts"
import { defineConfig, UserConfig } from "vite";
export default defineConfig({
  ssr: {
    noExternal: ['vite'],
  },
  build: {
    target: "esnext",
    rollupOptions: {
      input: 'app/entry.client.ts'
    },
    outDir: 'dist/client',
    assetsDir: 'dist/asset',
    ssrEmitAssets: true,
    manifest: true
  },
  plugins: []
});
```

The second requirement is that you define a client, and server entry point for compilation to work effectively

```ts title="app/entry.server.ts"
import { GenerateRouteTree } from 'htmx-router/router';
export const tree = GenerateRouteTree({
  modules: import.meta.glob('./routes/**/*.{ts,tsx}', { eager: true }),
  scope: "./routes",
});
```

```ts title="app/entry.client.ts"
// vite complains if the client entry doesn't have a default export
export default {};
```

## Plugins

There are also two optional plugins provided by htmx-router for vite, with both being optional, however `ClientIsland` is required if you plan on using [client islands](../island/client.md)

```ts title="vite.config.ts"
import { BundleSplitter, ClientIsland } from "htmx-router/vite";
import { defineConfig, UserConfig } from "vite";
export default defineConfig({
  // same as before
  plugins: [
		ClientIsland("react"),
		BundleSplitter()
	],
});
```

We also recommend using [tsconfig paths](https://www.npmjs.com/package/vite-tsconfig-paths) to make `~` resolve to `./app/`, that way as you move your route files around you do not have to change your relative imports.

```json title="tsconfig.json"
{
	"compilerOptions": {
		"paths": { "~/*": ["./app/*"] },
		"noEmit": true // Vite takes care of building everything, not tsc
	}
}

```

## Build Scripts

Since there is a client and a server build being generated, we recommend making a build setup like below so everything can be streamlined

```json title="package.json"
{
	"type": "module",
	"scripts": {
		"prepare": "npx htmx-router",
		"dev": "node ./server.js",
		"build": "run-s build:*",
		"build:client": "vite build",
		"build:server": "vite build --ssr app/entry.server.ts --outDir dist/server",
		"preview": "cross-env NODE_ENV=production node ./server.js"
	}
}
```