import { createRequestHandler } from 'htmx-router';
import { renderToString } from 'react-dom/server';
import express from 'express';
import morgan from "morgan";

const port = process.env.PORT || 5173;
const app = express();


const viteDevServer =
	process.env.NODE_ENV === "production"
		? null
		: await import("vite").then((vite) =>
				vite.createServer({
					server: { middlewareMode: true },
					appType: 'custom'
				})
			);

if (viteDevServer) {
	app.use(viteDevServer.middlewares)
} else {
	app.use(express.static("./dist/client"));
	app.use("/dist/asset", express.static("./dist/server/dist/asset",));
}

// logging
app.use(morgan("tiny"));

const build = viteDevServer
	? () => viteDevServer.ssrLoadModule('./app/entry.server.ts')
	: await import('./dist/server/entry.server.js');

app.use('*', createRequestHandler.http({
	build, viteDevServer,
	render: (jsx, headers) => {
		headers.set("Content-Type", "text/html; charset=UTF-8");

		const stream = renderToString(jsx);
		return new Response(stream, { headers });
	}
}));

// Start http server
app.listen(port, () => {
	console.log(`Server started at http://localhost:${port}`)
})

 // Reload pages on file change
if (viteDevServer)
	viteDevServer.watcher.on('change', (file) => {
	console.log(`File changed: ${file}`);

	console.log('Triggering full page reload');
	viteDevServer.ws.send({ type: 'full-reload' });
});