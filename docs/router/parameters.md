# Route Parameters

A route can optionally export a `parameters` object, which is a `Record` of parameter names, paired with functions to safely decode them from the url string. If this object is exported the router will attempt to parse the params before calling the `loader` or `action` function, meaning for those functions to be called the url parameters must be valid.

```ts
export const parameters = {
  kind: (s: string) => {
    if (s !== "user" && s !== "group") throw new Response("invalid kind", { status: 400, statusText: "Bad Request" });
    return s;
  },
  id: Number
}

export async function loader({ params }: RouteContext<typeof parameters>) {
  // no type errors here, because they are of these types exactly
  const kind : "user" | "group" = params.kind;
  const id   : number           = params.number;
}
```

The route context also includes:

| Key | Description |
| :- | :- |
| `request` | [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) the original request object |
| `url`     | The already parsed [URL](https://developer.mozilla.org/en-US/docs/Web/API/URL) object of the request |
| `cookie`  | The [Cookies](../api/cookie.md) from the request, and set cookies will be added to the final response |
| `headers` | A header object that will be merged with the final response allowing early header setting |
| `params`  | This object will be empty if no `parameters` object is exported |