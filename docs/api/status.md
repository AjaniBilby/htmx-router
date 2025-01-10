# Status API

A helper for determining a status text from code and visa versa.

## MakeStatus

For returning plain text as a response
```ts
import { MakeStatus } from "htmx-router/response";

MakeStatus("I'm a teaPot"); // { status: 418, statusText: "I'm a teapot" }
MakeStatus(301);            // { status: 301, statusText: "Moved Permanently" }
```