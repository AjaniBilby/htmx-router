/**
 * These types are just helpers which could be useful
 * But the goal is to add a feature in the future to help will shells merging meta data
 * Currently I want more experience using the slug-shell pattern before I build it out
 */

export type MetaDescriptor = { charSet: "utf-8"; }
	| { title: string; }
	| { name: string; content: string; }
	| { property: string; content: string; }
	| { httpEquiv: string; content: string; }
	| { "script:ld+json": LdJsonObject; }
	| { tagName: "meta" | "link"; [name: string]: string; }
	| { [name: string]: unknown; };

export type LdJsonObject    = { [Key in string]?: LdJsonValue | undefined; };
export type LdJsonArray     = LdJsonValue[] | readonly LdJsonValue[];
export type LdJsonPrimitive = string | number | boolean | null;
export type LdJsonValue     = LdJsonPrimitive | LdJsonObject | LdJsonArray;

// export type ShellOptions = { meta?: Array<MetaDescriptor> } | undefined;
// export type ShellProps<T> = T & ShellOptions;