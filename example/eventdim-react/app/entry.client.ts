import "~/client/request";
import "~/manifest";

document.body.addEventListener('htmx:beforeOnLoad', function (e) {
	const evt = e as CustomEvent<{
		xhr: { status: number };
		shouldSwap: boolean;
		isError: boolean;
	}>;

	evt.detail.shouldSwap = true;
	evt.detail.isError = false;
});

// vite complains if the client entry doesn't have a default export
export default {};