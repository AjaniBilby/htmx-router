# htmx Router

A simple file based router with support for dynamic + client islands, route-less endpoints, and built in CSS sheet generation.

- [htmx Router](#htmx-router)
  - [Setup](#setup)
  - [Routing](#routing)
    - [Route Module](#route-module)
    - [Nested Route Rendering](#nested-route-rendering)
    - [JSX Rendering](#jsx-rendering)
  - [Route Contexts](#route-contexts)
    - [Params](#params)
    - [Cookies](#cookies)
    - [Headers](#headers)
    - [Request](#request)
    - [URL](#url)
  - [Style Sheets](#style-sheets)
  - [Route-less Endpoint](#route-less-endpoint)
  - [Islands](#islands)
    - [Dynamic](#dynamic)
    - [Client](#client)


## Setup

Create a `htmx-router.json` in the root of your project defining where you want your router file to be placed, and where your routes are.
You can also define where you want to create your client component bindings, and for what target framework.
```json
{
  "router": {
    "folder": "./source/routes",
    "output": "./source/router.tsx"
  },
  "client": {
    "adapter": "react",
    "source": "./source/client.tsx"
  }
}
```

Once you have done this, run `npx htmx-router` to generate the artifacts to start development.
We recommand you copy the setup from `examples/react` for your `server.js`, `entry.server.ts`, and `entry.client.ts`.

Don't forget that in all rendered routes you must include the `<RouterHeader/>` component in your head for hydration and `StyleClass`s to apply affectively.


## Routing

Routing applies in a depth first order, where it will match in order:
  1. The `_index`
  2. Static sub-routes
  3. Url path-param wildcards
  4. Catchall slug

This allows for easy overriding and fallback behaviour. For instance with the routes.
```
/user/$id.tsx
/user/me.tsx
/user/$.tsx
```

It will match on the `/user/me` route if applicable, and otherwise will fallback to attempt to match on `/user/$id`, and if the wildcard route fails, it will try the generic slug route `/user/$.tsx`.

If a route returns `null` the router will continue the depth first search, allowing for dynamic flow through of the routes.

### Route Module

A route module must define a `parameters` export, which defines how the url path params should be parsed when attempting to match the route.
You can use any function which takes a string, and returns something as the parser. You can also simply use JS-Builtin functions for this, and there is a special case with the `Number` function so it will reject on `NaN` values.
```js
export const parameters = { id: Number };
```

A route can additionally define a loader, which is called on `GET` and `HEAD` requests
```ts
export async function loader({}: RouteContext<typeof parameters>);
```

With the `action` function being called for all other methods
```ts
export async function action({}: RouteContext<typeof parameters>);
```

If any value is thrown by the parameter parsing, or the render functions (`loader`/`action`) it will boil up, attempting first to call an error function is supplied in the route, and otherwise boiling up to the nearest slug route's `error` function.
```ts
export async function error(ctx: GenericContext, error: unknown);
```

### Nested Route Rendering

The router will not do nested layouts, if that behaviour is required we recommend using the slug-shell pattern.
Where you define a slug route, and export a `shell` function which takes the `JSX` rendered result from the sub route, and renders the upper route around it.

This allows flexibility at runtime on how nested route rendering behaves, and can also allow you to ensure you are not reloading data from the db which is already loaded by a sub-route based on how you parse up data through your slug shells.

We recommend you look at [Predictable Bot](https://github.com/AjaniBilby/predictable) as an example of this pattern performed simply.


### JSX Rendering

htmx-router is jsx templating agnostic for SSR, instead only requiring a definition provided when creating your request handler, allowing you to BYO JSX templating.
```js
// @kitajs/html
app.use('*', createRequestHandler.http({
  build,
  viteDevServer,
  render: (res) => {
    const headers = new Headers();
    headers.set("Content-Type", "text/html; charset=UTF-8");
    return new Response(String(res), { headers });
  }
}));

// React
app.use('*', createRequestHandler.http({
  build,
  viteDevServer,
  render: (res) => {
    const headers = new Headers();
    headers.set("Content-Type", "text/html; charset=UTF-8");
    return new Response(renderToString(res), { headers });
  }
}));
```

## Route Contexts

There are two kinds of route context, the `RouteContext<T>` which is the resolved route with parameterization, and the `GenericContext` which is used by error functions, and dynamic loads.

### Params

In the `GenericContext` this will simply be an object with string key value pairs for the parameters, and only the `RouteContext<T>` for `loader` and `action` will have the parameters pre-parsed by your `parameters` definition.

### Cookies

The `RouteContext` and `GenericContext`s both provide a `cookie` object, with the cookie's pre-parsed from the request headers.
It also has a built in `set(name, value, options)` function which will add the appropriate headers to the response for the cookie changes.

### Headers

This is a header object useful for adding response headers when you haven't fully finished generating your response yet.
These headers will merge with the response object created by the provided `render` function, with response headers overriding any conflicting `ctx.headers` values.

### Request

This is the original request object, including request headers.

### URL

The parsed `URL` object of the incoming request.

## Style Sheets

htmx-router includes a `StyleClass` object, which can be used to define CSS classes without needing a unique name.
StyleClasses should only be defined at the top level of a file, and not created within a function, or dynamically during runtime.

```ts
const myClass = new StyleClass(`myClass`, `
.this:hover {
  background-color: red;
}
`).name;
```

## Route-less Endpoint

This should be defined at the top level of your file, these endpoints can optionally be given an name which will help for debugging network requests, but they do not need to be unique.
```ts
const endpoint_url = new Endpoint((ctx: GenericContext) => {
  return new Response("Hello World");
}, "hello-world").url;
```

## Islands

> Tip: Don't forget to wrap your islands in a hx-preserve to prevent losing state. And use `display: contents;` to make that wrapping div transparent for grid and other layout features.

### Dynamic

A dynamic component takes params which will be converted into the props of the loader function, these props may only be string key string value pairs as they are encoded the the query string to allow for browser side caching.

The body of a dynamic component is the pre-rendered infill that will display while the client is loading the dynamic content.

```tsx
async function MyProfile(params: {}, ctx: GenericContext): Promise<JSX.Element> {
  ctx.headers.set('Cache-Control', "private, max-age=120");
  const userID = ctx.cookie.get('userID');
  if (!userID) return <></>;

  const user = await GetUser(userID);
  if (!user) return <></>;

  return <a href={`/user/${userID}`}>
    <div safe>{user.name}</div>
  </a>
}

export async function loader({ params }: RouteContext<typeof parameters>) {
  return <Dynamic params={{}} loader={MyProfile}>
    put your ssr pre-rendered skeleton here
  </Dynamic>
}
```

### Client

Import all of the components you want to be able to use on the client side into your `client.tsx`, if you are running a dev server this file will automatically generate the clientized version, otherwise use the `npx htmx-router` command to regenerate these artifacts.

Once a component has been clientized you can import it as use it like normal, however the body is now overwritten to it will render immediately on the server, and then all props will parsed to the client for it to be rendered properly in the browser.

```tsx
<Client.Counter>
  <button>No yet hydrated...</button> {/* this will be overwritten in the browser once hydrated */}
</Client.Counter>
```

It is very important that you ensure your `Client` component has a single child element, if there are multiple child components the browser will only mount to the last child causing artifacting.