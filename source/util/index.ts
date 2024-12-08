export function MergeHeaders(base: Headers, extension: Headers, override: boolean) {
	extension.forEach((val, key) => {
		if (!override && base.has(key)) return;
		base.set(key, val);
	});
}