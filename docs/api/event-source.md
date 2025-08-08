# EventSource API

The goal of these helpers is to be as close as possible to the client [EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource), however it needs to diverge since the javascript API is receive only, but the server needs to send data.

When it's being created you must give it the request object, and you can optionally defined how often keep-alive pulsed should be sent (defaults to 30sec).
```ts
import { EventSource } from "htmx-router/event-source";

export function loader({ request, render }: RouteContext) {
  const source = new EventSource<true>(request, render);

  const timer = setInterval(() => {
    source.dispatch("message", <b>hello everyone</b>);
    if (source.readyState === 2) { // the source has been closed
      clearInterval(timer);
    }
  }, 1000);

  return source.response();
}
```

An `EventSource` will also auto close when the server receives a `SIGTERM` or `SIGHUP` so it can gracefully shutdown.

There is also a `EventSourceSet` which is designed for pooling streams to send the same live information to multiple connections.
`EventSource`s will be auto removed from the set if it is closed when a `.dispatch` is issued.
```ts
import { EventSource, EventSourceSet } from "htmx-router/event-source";

const group = new EventSourceSet();
setInterval(() => {
  group.dispatch("message", "hello everyone");
}, 1000);

export function loader({ request }: RouteContext) {
  const source = new EventSource(request);
  group.add(source);

  return source.response();
}
```

Note using `group.delete()` or `group.clear()` will not close the connection, instead just removing them from the group.
This means you will need to manually close the source when you delete it from the set, and use `group.closeAll()`.

## Tips

Combining this with [htmx sse](https://htmx.org/extensions/sse/) can allow you to stream live data to multiple clients at once, or create your own pool of sources which manages which user has a lock on something, and on an interval you send a lock icon down for if they do or do not have the lock. Then when the dispatch fails you unlock the entity from that user since the connection was closed. Then you don't have to rely on your client successfully sending a beacon when the window is closed to free the lock.