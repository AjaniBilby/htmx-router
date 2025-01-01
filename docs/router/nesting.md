# Route Nesting

In other routers, route nesting is typically top down, meaning the parent route will render, then use an `<Outlet/>` or some other means to embed the child route's body within itself. However this can create an issue because the parent doesn't know what child may be rendered in it, so it can't reliably parse data into the child so you end up with duplicate db lookups, and permission checks.

Instead htmx-router relies on inverting that with what we call slug shelling.
Where you define a slug route (which may have no actual endpoints), but it exports a shell function, which is given any data it needs that it's child will have already loaded, as well as the child's body. You can then chain multiple slugs together to create deeply nested routes.

```tsx title="routes/$userID/$.tsx"

import * as parent from "~/routes/$.tsx";

export function shell(inner: JSX.Element, props: ShellOptions<{ user: { id: number, name: string }}>) {
  return parent.shell(<div>
    Hello user <a href={`/user/${props.user.id}`}></a>
    {inner}
  </div>, props);
}
```

This reverse nesting means it is up to the child whether or not it wants to be nested in the parent, meaning you can easily create new routes for html partials with no, or only part inheritance.

[SlugOptions](../api/shell.md) also includes the ability to add metadata for generating a page's meta-tags for the final render.