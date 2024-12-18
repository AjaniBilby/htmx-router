/**
 * Not the best hash in the world, but it's something really fast that will work on all JS runtimes
 */
export function QuickHash(input: string) {
	let hash = 0;
	for (let i = 0; i < input.length; i++) {
		hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
	}
	return hash.toString(36).slice(0, 5);
}