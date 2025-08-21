interface HTMX {
	ajax: (method: string, url: string, options?: {
		target?: string;
		swap?: string;
	}) => Promise<void>;
	process: (element: HTMLElement) => void;
}

function htmx(): HTMX {
	const htmx = (window as unknown as { htmx?: HTMX }).htmx;
	if (typeof htmx !== "object") throw new Error("Missing htmx");

	return htmx;
}


const driver = (typeof document === "object" ? document.createElement("a") : null)!;
export function htmxNavigate(href: string = "", pushHistory = true): void {
	if (typeof window !== "object") return;
	if (!driver) return;

	const url = new URL(href, window.location.href);
	if (url.host !== window.location.host) {
		window.location.assign(href);
		return;
	}

	driver.setAttribute("hx-boost", "true");
	driver.setAttribute("href", url.href);

	if (pushHistory) {
		driver.setAttribute("hx-push-url", "true");
		driver.removeAttribute("hx-replace-url");
	} else {
		driver.setAttribute("hx-replace-url", "true");
		driver.removeAttribute("hx-push-url");
	}

	document.body.appendChild(driver);
	htmx().process(driver);
	driver.click();
}

/**
 * @deprecated - use htmxNavigate() instead
 */
export const navigate = htmxNavigate();

/**
 * @deprecated - use navigate() instead
 */
export function revalidate(): void {
	return htmxNavigate("", false);
}

export async function htmxAppend(href: string, verb = "GET"): Promise<void> {
	await htmx().ajax(verb, href, {
		target: 'body',
		swap:   'beforeend'
	});
}