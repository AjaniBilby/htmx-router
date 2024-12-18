import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	ssr: {
		noExternal: ['vite']
	},
	build: {
		target: "esnext",
		rollupOptions: {
			input: 'app/entry.client.ts'
		},
		outDir: 'dist/client',
		assetsDir: 'dist/asset',
		manifest: true
	},
	plugins: [
		tsconfigPaths()
	],
});
