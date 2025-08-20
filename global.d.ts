declare namespace JSX {
	interface Element {}
	interface IntrinsicElements {
		[elementName: string]: any;
	}
	interface Fragment {}
}

interface ImportMeta {
	glob: (
		pattern: string,
		options?: {
			eager?: boolean;
			import?: string;
			as?: string;
		}
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	) => Record<string, any>;
	env: {
		BASE_URL: string,
		DEV: boolean,
		MODE: string,
		PROD: boolean,
		SSR: true,
	} & Record<`VITE_${string}`, string>
}