export const isProduction = process.env.NODE_ENV === "production";
export const site_name = isProduction ? "EventDim Dev" : "EventDim";

export const site_theme = isProduction ? "#1181c7" : "#18181b";


// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function AssertUnreachable(x: never): never {
	throw new Error("Unreachable code path reachable");
}

export function CutString(str: string, pivot: string, offset = 1): [string, string] {
	if (offset === 0) return [str, ""];

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


export function Timeout(ms: number) {
	return new Promise((res) => setTimeout(res, ms))
}