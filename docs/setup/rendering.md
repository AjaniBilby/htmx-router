
# Rendering Setup

Since htmx-router allows you to BYO jsx templating, it does mean you also have to BYO renderer. Below is a simple example for react.
```js
import { renderToReadableStream } from 'react-dom/server';

async function render(res: JSX.Element, headers: Headers) {
  headers.set("Content-Type", "text/html; charset=UTF-8");

  return await renderToReadableStream(res);
}
```