# CSS API

When creating a new style you must give it a css save class name, however this value does not need to be unique, as the name will have a hash appended to it based on the style itself, so the only name collision that will occur is when you use the same name with the same definition which just a duplicate definition.

Since the name of the class will be mutated, in your source you should refer to it as `.this` which will be replaced by the mutated name.
```ts
import { Style } from "htmx-router/css";

const myStyle = new Style("myStyle", `
.this {
  background-color: red;
}

.this button {
  background-color: blue;
}`);
```

Then to use the style simply refer to it's name
```jsx
<div class={myStyle.name}>
  I am red
  <button>I am blue</button>
</div>
```

These styles **must** be defined at the top level of your file for them to be included in the generated style sheet.
If you create a new style on request, or at a later point in time, it may not be included in the CSS bundled provided to the client.

To import the generated style sheet on the client use the [`<Scripts>`](../components/scripts.md) component which will do this automatically.
Or you can do it manually via:
```jsx
import { GetSheetUrl } from "htmx-router/css";
<link href={GetSheetUrl()} rel="stylesheet"></link>
```