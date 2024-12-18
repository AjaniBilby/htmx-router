/**
 * Builds the SSR and client side mounter for client components
 */

import { readFile, writeFile } from "fs/promises";
import { init, parse } from "es-module-lexer";

import { QuickHash } from "~/util/hash.js";
import { CutString } from "~/helper.js";

const pivot = `\n// DO NOT EDIT BELOW THIS LINE\n`;

export async function GenerateClient(config: { adapter: string, source: string }, force = false) {
	const file = await readFile(config.source, "utf8");

	const [ source, history ] = CutString(file, pivot);

	const hash = QuickHash(source);
	if (!force && ExtractHash(history) === hash) return;

	await init;
	const parsed = parse(source)[0];

	const imports = new Array<string>();
	const names = new Array<string>();
	for (const imp of parsed) {
		if (imp.a !== -1) continue;
		if (imp.t !==  1) continue;

		imports.push(source.slice(imp.ss, imp.se));
		names.push(...ExtractNames(source.slice(imp.ss, imp.s)))
	}

	await writeFile(config.source, source
		+ pivot
		+ `// hash: ${hash}\n`
		+ BuildClientServer(names)
	);

	await writeFile(CutString(config.source, ".", -1)[0] + ".manifest.tsx",
		BuildClientManifest(config.adapter, names, imports)
	)
}

function BuildClientServer(names: string[]) {
	let out = "type FirstArg<T> = T extends (arg: infer U, ...args: any[]) => any ? U : never;\n"
		+ "function mount(name: string, data: string, ssr?: JSX.Element) {\n"
		+ "\treturn (<>\n"
		+ `\t\t<div style={{ display: "contents" }}>{ssr}</div>\n`
		+ "\t\t<script>{`Router.mountAboveWith(\"${name}\", JSON.parse(\"${data}\"))`}</script>\n"
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
		+ `if (process.env.NODE_ENV !== "production") {\n`
		+ `\t(await import( "htmx-router/bin/client/watch.js")).WatchClient();\n`
		+ `}`;

	return out;
}

function BuildClientManifest(type: string, names: string[], imports: string[]) {
	let out = "/*------------------------------------------\n"
		+ " * Generated by htmx-router                *\n"
		+ " * Warn: Any changes will be overwritten   *\n"
		+ "-------------------------------------------*/\n"
		+ imports.join(";\n") + ";\n";

	switch (type) {
		case "react": out += BuildReactClientManifest(names); break;
		default:
			console.error(`Unsupported client adapter ${type}`);
			process.exit(1);
	}

	out += "export default client;\n"
		+ "(window as any).CLIENT = client;"

	return out;
}

function BuildReactClientManifest(names: string[]) {
	let out = `import ReactDOM from "react-dom/client";\n\n`
		+ "const client = {\n";

	for (const name of names) out += `\t${name}: (element: HTMLElement, props: any) => ReactDOM.createRoot(element).render(<${name} {...props} />),\n`
	out += "};\n";

	return out;
}


function ExtractNames (str: string) {
	const start = str.indexOf("{");
	if (start === -1) {
		const middle = CutString(CutString(str, "import")[1], "from", -1)[0];

		return [ ExtractName(middle) ];
	}

	const end = str.lastIndexOf("}");

	const segments = str.slice(start+1, end).split(",");
	return segments.map(ExtractName);
}


function ExtractName (str: string) {
	const parts = CutString(str, "as");
	if (parts[1]) return parts[1].trim();
	return parts[0].trim();
}


function ExtractHash(source: string) {
	const regex = /\/\/\s+hash\s*:\s*(\w+)/;
	const match = source.match(regex);

	if (match) return match[1] || "";
	return "";
}