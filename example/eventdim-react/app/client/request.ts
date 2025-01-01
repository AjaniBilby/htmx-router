/**
 * Override the AJAX and fetch requests for the client so we can keep track of the number of on-going requests
 * Based on this count we can add/remove the [data-loading] attribute to trigger CSS animations to show loading is occurring
 */

/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

let activeRequests = 0;
const updateLoadingAttribute = () => {
	if (activeRequests > 0) document.body.setAttribute('data-loading', 'true');
	else document.body.removeAttribute('data-loading');
};

const originalXHROpen = XMLHttpRequest.prototype.open;
const originalXHRSend = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.open = function (...args: Parameters<typeof originalXHROpen>) {
	this.addEventListener('loadstart', () => {
		activeRequests++;
		updateLoadingAttribute();
	});

	this.addEventListener('loadend', () => {
		activeRequests--;
		updateLoadingAttribute();
	});

	originalXHROpen.apply(this, args);
};
XMLHttpRequest.prototype.send = function (...args) {
	originalXHRSend.apply(this, args);
};

// Override fetch
const originalFetch = window.fetch;
window.fetch = async (...args) => {
	activeRequests++;
	updateLoadingAttribute();

	try {
		const response = await originalFetch(...args);
		return response;
	} finally {
		activeRequests--;
		updateLoadingAttribute();
	}
};