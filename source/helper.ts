export function StyleCSS(props: { [key: string]: string | number }) {
	let out = "";

	for (const key in props) {
		const safeKey = key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
		const safeVal = props[key].toString().replace(/"/g, "\\\"");
		out += `${safeKey}: ${safeVal};`
	}

	return out;
}