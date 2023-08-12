import * as elements from 'typed-html';

export function Link(props: {
	to: string,
	class?: string,
	target?: string,
	style?: string
}, contents: string[]) {
	return <a
		target={props.target || ""}
		class={props.class || ""}
		style={props.style || ""}
		href={props.to}
		hx-get={props.to}
		// Chrome doesn't support 'Vary' headers for effective caching
		hx-headers='{"Cache-Control": "no-cache"}'
	>{contents}</a>
}