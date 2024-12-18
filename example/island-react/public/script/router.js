window.Router = (function () {
	const theme = {
		infer: () => {
			const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			const current = prefersDark ? 'dark' : 'light';
			localStorage.setItem("theme", current);

			return current;
		},
		apply: () => {
			const current = localStorage.getItem("theme") || theme.infer();
			document.documentElement.setAttribute('data-theme', current);
		},
		toggle: () => {
			const current = localStorage.getItem("theme") || theme.infer();
			if (current === "dark") localStorage.setItem("theme", "light");
			else localStorage.setItem("theme", "dark");

			theme.apply();
		}
	}

	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
		theme.infer();
		theme.apply();
	});
	theme.apply();


	const mountRequests = [];
	function RequestMount(funcName, json) {
		mountRequests.push([funcName, document.currentScript.previousElementSibling, json]);
	}

	function Mount() {
		if (mountRequests.length < 1) return;

		console.log("hydrating...");
		for (const [ funcName, element, json ] of mountRequests) {
			const func = window.CLIENT[funcName];
			func(element, json);
		}
		mountRequests.length = 0;
	}

	document.addEventListener("DOMContentLoaded", Mount);
	if (htmx) htmx.onLoad(Mount);

	return {
		mountAboveWith: RequestMount,
		theme
	}
})();