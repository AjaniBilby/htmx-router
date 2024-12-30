export type ParameterShaper = Record<string, (val: string) => any>;

export type ParameterPrelude<T extends ParameterShaper> = {
	[K in keyof T]: string;
};

export type Parameterized<T extends ParameterShaper> = {
	[K in keyof T]: ReturnType<T[K]>;
};

export type Parameterizer<T extends ParameterShaper> = {
	[K in keyof T]: (val: ReturnType<T[K]>) => string;
};