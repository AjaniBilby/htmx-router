# Navigate API

```ts
import { navigate, revalidate, htmxAppend } from "htmx-router/navigate";
```

These functions are just client side helpers for getting some common htmx calls you might make from a front-end framework.

## Navigate

```ts
async function navigate(href: string, pushUrl = true)
```

Takes the href you want to navigate, if the href is part of the same domain it will do a [htmx boost](https://htmx.org/attributes/hx-boost/) to that page, otherwise it will do a full page reload to that location.

`pushUrl` defines whether or not the navigation should be added the browser's history.

## Revalidate

```ts
async function revalidate()
```

A short cut to `navigate()` to the current location effectively revalidating the current page.

## htmxAppend

```ts
async function htmxAppend(href: string, verb = "GET")
```

Will load the href and append the html response to the end of the body.
This is useful for server side dialogs