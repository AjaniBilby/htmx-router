import { site_name, site_theme } from "~/util";

export async function loader() {
	const headers = new Headers();
	headers.set("Content-Type", "application/manifest+json");
	headers.set("Cache-Control", "max-age=86400");

	return new Response(JSON.stringify({
		"name": site_name,
		"short_name": "EventDim",
		"icons": [
			{
				"src": "/remix.ico",
				"sizes": "48x48",
				"type": "image/x-icon"
			},
		],
		"start_url": "/",
		"scope": "/",
		"display_override": ["tabbed", "minimal-ui", "standalone"],
		"display": "standalone",
		"theme_color": site_theme,
		"background_color": "#ffffff"
	}), { headers })
}