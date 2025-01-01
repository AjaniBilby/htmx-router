# Cookie API

```ts
import { Cookies, CookieOptions } from "htmx-router/cookies";
```

You can either give the `Cookies` class a string, or whole [document](https://developer.mozilla.org/en-US/docs/Web/API/Document) object to read from.
When given a `document` object it will go into client mode, and when setting cookies it will change them in the browser as well.
To prevent this behaviour, provide `document.cookies` instead of the whole `document` object.


```ts
import { Cookie } from "htmx-router/css";

const local = new Cookies(document.cookie);
local.set("key", "value"); // changed document.cookie

let res: Response; // assume it exists
const external = new Cookie(res.headers.get("cookie"));
local.set("foo", "bar");

const delta = local.export(); // array of Set-Cookie headers to make the changes
```