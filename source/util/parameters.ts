export type Parameterized<T extends ParameterShaper> = {
	[K in keyof T]: ReturnType<T[K]>;
};

export type ParameterShaper = Record<string, (val: string) => any>;

export function Parameterize<T extends ParameterShaper>(params: { [key: string]: string }, shape: T): Parameterized<T> {
	const out: Partial<Parameterized<T>> = {};
	for (const key in shape) {
		const func = shape[key];
		const val = func(params[key]);

		// NaN moment
		if ((func as unknown) === Number && typeof val === "number" && isNaN(val)) throw new Error("Invalid Number");

		out[key] = val;
	}

	return out as Parameterized<T>;
}