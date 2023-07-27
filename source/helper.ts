import type * as CSS from 'csstype';

export function StyleCSS(props: CSS.Properties<string | number>) {
	let out = "";

	for (const key in props) {
		const value = props[key as keyof CSS.Properties<string | number>];
		if (typeof(value) !== "string" && typeof(value) !== "number" ) continue;

		const safeKey = key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
		const safeVal = value.toString().replace(/"/g, "\\\"");
		out += `${safeKey}: ${safeVal};`
	}

	return out;
}