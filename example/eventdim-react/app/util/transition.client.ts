export async function TransitionStart() {
	return new Promise<void>((res) => {
		if (typeof document.startViewTransition === "function") return document.startViewTransition(res);
		res();
	});
}