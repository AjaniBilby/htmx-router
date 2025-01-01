import { ShellOptions } from "htmx-router/shell";
import { RouteContext } from "htmx-router/router";

import { Scripts } from "~/component/server/scripts";
import { Navbar } from "~/component/navbar";
import { Head } from "~/component/server/head";

import mainsheetUrl from "~/styles/main.css?url";
import { site_theme } from "~/util";



const headers = <>
	<meta charSet="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<meta name="robots" content="noindex" />
	<script src="https://unpkg.com/htmx.org@2.0.3"></script>
	<script src="https://unpkg.com/htmx-ext-preload@2.1.0/preload.js"></script>
	<script src="https://unpkg.com/htmx-ext-sse@2.2.2/sse.js"></script>
	<link href={mainsheetUrl} rel="stylesheet"></link>
	<link rel="manifest" href="/site.manifest.json"></link>
	<link rel="icon" href="/remix.ico"></link>
</>


export function loader (){
	return new Response("No Route Found", { status: 404, statusText: "Not Found" });
}


export async function shell(inner: JSX.Element, options: ShellOptions) {
	return <html lang="en">
		<Head options={options}>
			{ headers }
			<title>{options?.title || "Skybase"}</title>
			<meta name="theme-color" content={site_theme} />
			<Scripts />
		</Head>
		<body hx-boost="true" hx-ext="preload">
			<Navbar />
			{inner}
		</body>
	</html>
}


export async function error(ctx: RouteContext, e: unknown) {
	const message = await ErrorBody(e)

	return <html lang="en" >
	<head>
		{ headers }
		<title>Error</title>
		<meta name="theme-color" content="#dc2626" />
		<Scripts />
	</head>
	<body>
		<Navbar />
		<div className="wrapper">
			<div className="card" style={{
				whiteSpace: "pre-wrap",
				padding: "1rem 1.5rem",
				marginBlock: "3rem"
			}}>
				{message}
			</div>
		</div>
	</body>
</html>;
}

async function ErrorBody(error: unknown) {
	if (error instanceof Response) {
		return <>
			<h1 style={{ marginTop: 0 }}>{error.status} {error.statusText}</h1>
			<p>{await error.text()}</p>
		</>
	} else if (error instanceof Error) {
		return <>
			<h1 style={{ marginTop: 0 }}>Error</h1>
			<p>{error.message}</p>
			<p>Stack trace</p>
			<pre>{error.stack}</pre>
		</>
	} else {
		return <>
			<h1 style={{ marginTop: 0 }}>Error</h1>
		</>
	}
}