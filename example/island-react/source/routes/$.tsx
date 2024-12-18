import { RouteHeaders } from "~/router"

export function shell(body: JSX.Element, options: { title: string }) {
	return <html lang="en">
		<head>
			<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
			<meta charSet="UTF-8"></meta>
			<RouteHeaders />
			<script src="https://unpkg.com/htmx.org@2.0.3"></script>
			<script type="module" src="/source/entry.client.ts"></script>
			<title>{options.title}</title>
		</head>
		<body style={{ display: "flex", alignItems: "center", justifyContent: "center" }} hx-boost="true">
			{body}
		</body>
	</html>
}