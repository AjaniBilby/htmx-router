# Endpoint API

This allows you to create a new endpoint with complete control over it for all methods and query strings, however it cannot use url parameters, and because it's query parameters aren't controlled by the router, their type safety must be done manually unlike [defer](./defer.md).

```ts
import { Endpoint } from "htmx-router/endpoint";

const endpoint = new Endpoint(({}: RouteContext) => {
  return text("hello world");
});

// fetch(endpoint.url);
```