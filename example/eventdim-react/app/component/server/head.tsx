import { RenderMetaDescriptor, ShellOptions } from "htmx-router";
import { renderToString } from 'react-dom/server';
import { ReactNode } from "react";


export function Head<T>(props: { options: ShellOptions<T>, children: ReactNode }) {
	const body = RenderMetaDescriptor(props.options)
		+ renderToString(props.children);

	return <head dangerouslySetInnerHTML={{ __html: body }}></head>;
}