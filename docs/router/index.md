# Router

The router will perform a depth first search until it hits an endpoint trying this options at each branch
  1. Resolve Index
  2. Resolve Next
  3. Resolve Wildcard
  4. Resolve Slug

The best way to illustrate this is through an example
```
routes
├─ post
│  └─ $postID.tsx
├─ user
│  ├─ $userID
│  │  ├─ _index.tsx
│  │  └─ edit.tsx
│  ├─ _index.tsx
│  └─ $.tsx
├─ _index.tsx
└─  $.tsx
```

| Url Path | Resolved File |
| :- | :- |
| `/` | `./routes/_index.tsx` |
| `/post/3` | `./routes/post/postID.tsx` |
| `/user` | `./routes/user/_index.tsx` |
| `/user/1` | `./routes/user/$userID/_index.tsx` |
| `/user/1/edit` | `./routes/user/$userID/edit.tsx` |

When a path resolves to a particular file it will try and call the `loader` function if the method is `GET` or `HEAD` and all other methods will try and call the `action` function, if the function is not defined it is treated as if the route doesn't exist and will continue the search.

The `loader` and `action` functions can also return `null` which cause the router to continue the search meaning you can allow fallthrough to a slug endpoint from others. For instances if `./routes/user/$userID/_index.tsx` returned `null` it would then try `./routes/user/$.tsx`.

Similarly if a route throws an error or returns a `Response` with a bad status code, it will try and parse that value to the `error` function of that file, and if it's not present it will back-track up the tree attempt to give the error to a slug's (`$.tsx`) error function.

The only exception is if you return a response object which includes the header `X-Caught`, in which case it will not be fed into an `error` function and instead will return up as the actual response.

```jsx title="Example route"
export async function loader(ctx: RouteContext) {
  return text("I was loaded");
}

export async function action(ctx: RouteContext) {
  return text("I was posted");
}

export async function error(ctx: RouteContext, e: unknown) {
	const message = await ErrorBody(e)

	return <html lang="en" >
	<Head options={{}}>
		{ headers }
		<Scripts />
	</Head>
	<body>
		{message}
	</body>
</html>;
}

async function ErrorBody(error: unknown) {
	if (error instanceof Response) {
		return <>
			<h1 style={{ marginTop: 0 }}>{error.status} {error.statusText}</h1>
			<p>{await error.text()}</p>
		</>
	}

	if (error instanceof Error) {
		console.error(error);
		return <>
			<h1 style={{ marginTop: 0 }}>Error</h1>
			<p>{error.message}</p>
			<p>Stack trace</p>
			<pre>{error.stack}</pre>
		</>
	}

	return <>
		<h1 style={{ marginTop: 0 }}>Error</h1>
	</>
}
```