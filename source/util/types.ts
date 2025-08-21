// Prevent deno from confusing this with globalThis.ResponseInit which doesn't include a header object
export type ResponseInit = NonNullable<ConstructorParameters<typeof Response>[1]>;