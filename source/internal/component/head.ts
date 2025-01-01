const generic = `import { RenderMetaDescriptor, ShellOptions } from "htmx-router/shell";

export function Head<T>(props: { options: ShellOptions<T>, children: JSX.Element }) {
	return <head>
		{ RenderMetaDescriptor(props.options) as "safe" }
		{ props.children as "safe" }
	</head>;
}`;

const react = `import { RenderMetaDescriptor, ShellOptions } from "htmx-router/shell";
import { renderToString } from 'react-dom/server';
import { ReactNode } from "react";

export function Head<T>(props: { options: ShellOptions<T>, children: ReactNode }) {
	const body = RenderMetaDescriptor(props.options)
		+ renderToString(props.children);

	return <head dangerouslySetInnerHTML={{ __html: body }}></head>;
}`;

export default {
	"*": generic,
	react
}