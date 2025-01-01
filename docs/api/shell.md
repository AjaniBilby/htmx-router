# Shell API

This includes helpers to parse [html](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta), [opengraph](https://ogp.me/), and [json+ld](https://json-ld.org/) metadata up the shell chain to be rendered at the root.

```ts
import { ShellOptions, ApplyMetaDefaults } from "htmx-router/shell";
import * as root from "~/routes/$.tsx";

export function shell(inner: JSX.Element, options: ShellOptions<{ somethingExtra: Data }>) {
  // do stuff that I care about with options.somethingExtra

  // will add these attributes to options if not present
  // does this is not applied deeply, and instead is only a shallow copy
  ApplyMetaDefaults(options, { title: "Place", description: "we do things here" });

  return root.shell(inner, options);
}
```

It also includes a `RenderMetaDescriptors` function which will take a `ShellOptions` object and render the meta tags directly to a string so they are agnostic of JSX templating, it is recommended that you use the [`<Head>`](../components/head.md) component to render them into the final html.