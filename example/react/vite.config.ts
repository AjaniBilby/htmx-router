import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	ssr: {
		noExternal: ['vite']
	},
	build: {
		target: "esnext",
		rollupOptions: {
			input: 'source/entry.client.ts'
		},
		// Output configuration
		outDir: 'dist/client',
		assetsDir: 'dist/asset'
	},
	plugins: [
		tsconfigPaths()
	],
});
