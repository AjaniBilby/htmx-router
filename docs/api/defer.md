# Defer API

A deferral is a type-safe endpoint designed for lazy loading of dynamic content on a static page, but can also be repurposed for loading html partials for htmx updates.

Before using a deferral you should first register it, or else the type safety will not be in place.
When registering a function you must define which functions to use to convert from the raw strings to the types you want to use.
This behaves identically to [route parameters](../router/parameters.md).

You optionally can define an extra object for going from the types back to strings for the original network call.

```ts title="Registering a Deferral"
import { Deferral, RegisterDeferral } from "htmx-router/defer";

const lazyCardParameters = {
  kind: (s: string) => {
    if (s !== "yes" && s !== "no") throw new Error("bad kind")
    return s;
  }
  id: Number
}
RegisterDeferral(lazyCardParameters, LazyCard, { kind: String, id: String });
function LazyCard({}: RouteContext<typeof>) { /**/ }
```

Once defined you can either use it directly in a [`<Defer>`](../components/defer.md)
```jsx
<Defer loader={LazyCard} params={{ kind: "yes", id: 420 }}>loading...</Defer>
```

Or you can get the URL for htmx use
```jsx
<div hx-get={Deferral(LazyCard, { kind: "no", id: 69 })}></div>
```