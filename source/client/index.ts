/**
 * Builds the SSR and client side mounter for client components
 */

import { readFile, writeFile } from "fs/promises";
import { init, parse } from "es-module-lexer";

import { QuickHash } from "~/util/hash.js";
import { CutString } from "~/helper.js";

const pivot = `\n// DO NOT EDIT BELOW THIS LINE\n`;

type Imports = Array<{ mapping: ImportName | ImportName[], href: string }>;
type ImportName = { name: string, original: string };

export async function GenerateClient(config: { adapter: string, source: string }, force = false) {
	const file = await readFile(config.source, "utf8");

	const [ source, history ] = CutString(file, pivot);

	const hash = QuickHash(source);
	if (!force && ExtractHash(history) === hash) return;

	await init;
	const imported = ParseImports(source);

	await Promise.all([
		writeFile(config.source, source
			+ pivot
			+ `// hash: ${hash}\n`
			+ BuildClientServer(config.adapter, imported)
		),
		writeFile(CutString(config.source, ".", -1)[0] + ".manifest.tsx",
			BuildClientManifest(config.adapter, imported)
		)
	])
}

function ParseImports(source: string) {
	const parsed = parse(source)[0];

	const out: Imports = [];
	for (const imported of parsed) {
		if (imported.a !== -1) continue;
		if (imported.t !==  1) continue;

		const href = source.slice(imported.s, imported.e);

		const front = source.slice(imported.ss, imported.s);
		const start = front.indexOf("{");
		if (start === -1) {
			const middle = CutString(CutString(front, "import")[1], "from", -1)[0];
			out.push({ mapping: ExtractName(middle), href });
			continue;
		}

		const end = front.lastIndexOf("}");

		const segments = front.slice(start+1, end).split(",");
		out.push({ mapping: segments.map(ExtractName), href });
	}

	return out;
}

function SafeScript(type: string, script: string) {
	switch (type) {
		case "react": return `<script dangerouslySetInnerHTML={{__html: ${script}}}></script>`
		default: return `<script>${script}</script>`
	}
}

function BuildClientServer(type: string, imported: Imports) {
	const names = new Array<string>();
	for (const imp of imported) {
		if (Array.isArray(imp.mapping)) names.push(...imp.mapping.map(x => x.name))
		else names.push(imp.mapping.name)
	}

	let out = `import { StyleClass } from "htmx-router";\n`
		+ `const island = new StyleClass("i", ".this{display:contents;}\\n").name;\n\n`
		+ "type FirstArg<T> = T extends (arg: infer U, ...args: any[]) => any ? U : never;\n"
		+ "function mount(name: string, data: string, ssr?: JSX.Element) {\n"
		+ "\treturn (<>\n"
		+ `\t\t<div className={island}>{ssr}</div>\n`
		+ `\t\t${SafeScript(type, "`Router.mountAboveWith('${name}', ${data})`")}\n`
		+ "\t</>);\n"
		+ "}\n"
		+ "\n"
		+ "const Client = {\n";

	for (const name of names) {
		out += `\t${name}: function(props: FirstArg<typeof ${name}> & { children?: JSX.Element }) {\n`
			+ `\t\tconst { children, ...rest } = props;\n`
			+ `\t\treturn mount("${name}", JSON.stringify(rest), children);\n`
			+ `\t},\n`
	}

	out += "}\nexport default Client;\n\n"
		+ `import { __RebuildClient__ } from "htmx-router/bin/client/watch.js";\n`
		+ `__RebuildClient__();`;

	return out;
}

const renderer = {
	react: '\t\tconst r = await import("react-dom/client");\n'
		+ "\t\tr.createRoot(element).render(<C {...props} />);\n"
}

function BuildClientManifest(type: string, imports: Imports) {
	let out = "/*------------------------------------------\n"
		+ " * Generated by htmx-router                *\n"
		+ " * Warn: Any changes will be overwritten   *\n"
		+ "-------------------------------------------*/\n\n"
		+ "/* eslint-disable @typescript-eslint/no-explicit-any */\n"
		+ "const client = {\n";

	const render = renderer[type as keyof typeof renderer];
	if (!render) {
		console.error(`Unsupported client adapter ${type}`);
		process.exit(1);
	}

	for (const imported of imports) {
		if (Array.isArray(imported.mapping)) {
			for (const map of imported.mapping) {
				out += `\t${map.name}: async (element: HTMLElement, props: any) => {\n`
					+ `\t\tconst C = (await import("${imported.href}")).${map.original};\n`
					+ render
					+ `\t},\n`;
			}
		} else {
			out += `\t${imported.mapping.name}: async (element: HTMLElement, props: any) => {\n`
				+ `\t\tconst C = (await import("${imported.href}")).default;\n`
				+ render
				+ `\t},\n`;
		}
	}

	out += "}\nexport default client;\n"
		+ "(window as any).CLIENT = client;"

	return out;
}


function ExtractName (str: string): ImportName {
	const parts = CutString(str, "as");

	if (parts[1].length !== 0) return { name: parts[1].trim(), original: parts[0].trim() };

	const name = parts[0].trim();
	return { name, original: name };
}


function ExtractHash(source: string) {
	const regex = /\/\/\s+hash\s*:\s*(\w+)/;
	const match = source.match(regex);

	if (match) return match[1] || "";
	return "";
}