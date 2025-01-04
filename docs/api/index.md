# API

The library is intentionally broken up into multiple files so that you can import only the part you need where you need it to help prevent server side features from being leaked to the client just because you wanted to use one of `htmx-router`'s apis on the client.

| Feature           | Package | Description |
| :-                | :- | :- |
| Cookies           | [`htmx-router/cookies`](./cookie.md)            | Request/Response cookie helper with client-side `document.cookie` support |
| CSS               | [`htmx-router/css`](./css.md)                   | CSS sheet builder with name collision prevention |
| Defer             | [`htmx-router/defer`](./defer.md)               | End-to-end type-safe html partial loading |
| Endpoint          | [`htmx-router/endpoint`](./endpoint.md)         | Define a new endpoint without making a whole new route |
| Server Side Event | [`htmx-router/event-source`](./event-source.md) | Helper for creating the [sse](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events) for an [EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) |
| Navigate          | Some helpers for client side htmx actions
| Response          | [`htmx-router/response`](./response.md) | Helpers to render typed json responses, and trigger client side navigation and revalidation
| Shell             | [`htmx-router/shell`](./shell.md) | Helpers to generate: [html](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta), [opengraph](https://ogp.me/), and [json+ld](https://json-ld.org/) meta-tags |