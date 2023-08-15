import type * as CSS from 'csstype';
import html from '@kitajs/html';

export function Link(props: html.PropsWithChildren<{
	to: string,
	class?: string,
	style?: string | CSS.Properties<0 | (string & {}), string & {}>,
	target?: string
}>) {
	return <a
		target={props.target || ""}
		class={props.class || ""}
		style={props.style || ""}
		href={props.to}
		hx-get={props.to}
		// Chrome doesn't support 'Vary' headers for effective caching
		hx-headers='{"Cache-Control": "no-cache"}'
	>{props.children}</a>
}