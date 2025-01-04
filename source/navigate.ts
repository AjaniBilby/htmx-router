interface HTMX {
	ajax: (method: string, url: string, options?: {
			target?: string;
			swap?: string;
			history?: boolean;
	}) => Promise<void>;
}

function htmx() {
	const htmx = (window as unknown as { htmx?: HTMX }).htmx;
	if (typeof htmx !== "object") throw new Error("Missing htmx");

	return htmx;
}

export async function navigate(href: string, pushUrl = true) {
	if (typeof window !== "object") return;

	const url = new URL(href, window.location.href);
	if (url.host !== window.location.host) {
		window.location.assign(href);
		return;
	}

	// Perform an HTMX GET request similar to hx-boost
	await htmx().ajax("GET", href, {
		target: 'body',
		swap:   'outerHTML',
		history: pushUrl
	});
}

export function revalidate() {
	return navigate("", false);
}

export async function htmxAppend(href: string, verb = "GET") {
	await htmx().ajax(verb, href, {
		target: 'body',
		swap:   'beforeend',
		history: false
	});
}