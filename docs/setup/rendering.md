
# Rendering Setup

Since htmx-router allows you to BYO jsx templating, it does mean you also have to BYO renderer. Below is a simple example for react.
```js
import { renderToString } from 'react-dom/server';

function render(res: JSX.Element) {
  const headers = new Headers();
  headers.set("Content-Type", "text/html; charset=UTF-8");

  const stream = renderToString(res);
  return new Response(stream, { headers });
}
```