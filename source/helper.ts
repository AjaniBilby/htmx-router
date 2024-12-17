export function CutString(str: string, pivot: string, offset = 1): [string, string] {
	if (offset > 0) {
		let cursor = 0;
		while (offset !== 0) {
			const i = str.indexOf(pivot, cursor);
			if (i === -1) return [str, ""];
			cursor = i+1;
			offset--;
		}
		cursor--;

		return [str.slice(0, cursor), str.slice(cursor+pivot.length)];
	}

	if (offset < 0) {
		let cursor = str.length;
		while (offset !== 0) {
			const i = str.lastIndexOf(pivot, cursor);
			if (i === -1) return [str, ""];
			cursor = i-1;
			offset++;
		}
		cursor++;

		return [str.slice(0, cursor), str.slice(cursor+pivot.length)];
	}

	return [str, ""];
}