# Server Setup

Finally you just need something to actually give the router http requests, this can be in the form of a [`http.IncomingMessage`](https://nodejs.org/api/http.html#class-httpincomingmessage) or a [`Request`](https://developer.mozilla.org/en-US/docs/Web/API/Request) object for the router to process.

```js title="server.js"
import express from 'express';
import { createRequestHandler } from 'htmx-router';

// create the vite server
const viteDevServer =
  process.env.NODE_ENV === "production"
    ? null
    : await import("vite").then((vite) =>
        vite.createServer({
          server: { middlewareMode: true },
          appType: 'custom'
        })
      );

// expose assets generated for the client by the server and client builds
const app = express();
if (viteDevServer) {
  app.use(viteDevServer.middlewares)
} else {
  app.use(express.static("./dist/client"));
  app.use("/dist/asset", express.static("./dist/server/dist/asset",));
}

// load your server entry
const build = viteDevServer
  ? () => viteDevServer.ssrLoadModule('./app/entry.server.ts')
  : await import('./dist/server/entry.server.js');

// bind to htmx-router
app.use('*', createRequestHandler.http({
  build, viteDevServer,
  render { /* (1) */ } 
}));

// Start http server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`)
});
```

1.  Defined later in [rendering](./render.md)

If you aren't using express, and say using something more like deno's native http server you would use `createRequestHandler.native` instead:
```js
Deno.serve(createRequestHandler.native({ build, viteDevServer, render }));
```

## Helpful extras

Here are a couple of helpful extras you could add to your `server.js`

### Reload on server code change
```js
import * as path from "path";
if (viteDevServer) {
  const focus = path.resolve("./app");
  viteDevServer.watcher.on('change', (file) => {
    if (!file.startsWith(focus)) return;
    console.log(`File changed: ${file}`);

    console.log('Triggering full page reload');
    viteDevServer.ws.send({ type: 'full-reload' });
  });
}
```

### Graceful shutdown
```js
const shutdown = () => {
  console.log("Shutting down server...");

  // Close the server gracefully
  app.close((err) => {
    if (err) {
      console.error("Error during server shutdown:", err);
      process.exit(1);
    }
    console.log("Server shut down gracefully.");
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGHUP', shutdown);
```