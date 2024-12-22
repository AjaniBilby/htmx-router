// Borrowed & modified from https://github.com/jenseng/abuse-the-platform/blob/main/app/utils/singleton.ts

export function Singleton<T>(name: string, cb: () => T): T {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const g = globalThis as any;
	g.__singletons ??= {};
	g.__singletons[name] ??= cb();
	return g.__singletons[name];
}