import { init, parse } from "es-module-lexer";

import { CutString, ServerOnlyWarning } from "../util.js";
ServerOnlyWarning("manifest-compiler");


export function CompileManifest(adapter: string, source: string, ssr: boolean) {
	const imported = ParseImports(source);

	if (ssr) return BuildServerManifest(adapter, imported);
	return BuildClientManifest(adapter, imported);;
}




type ImportName = { name: string, original: string };
type Imports = Array<{ mapping: ImportName | ImportName[], href: string }>;

await init; // ensure the webassembly module is ready

function ParseImports(source: string) {
	const parsed = parse(source)[0];

	const out: Imports = [];
	for (const imported of parsed) {
		if (imported.a !== -1) continue;
		if (imported.t !==  1) continue;

		const href = source.slice(imported.s, imported.e);
		if (href === "htmx-router") continue;

		const front = source.slice(imported.ss, imported.s);
		const start = front.indexOf("{");
		if (start === -1) {
			const middle = CutString(CutString(front, "import")[1], "from", -1)[0];
			out.push({ mapping: ExtractName(middle), href });
			continue;
		}

		const end = front.lastIndexOf("}");
		const middle = front.slice(start+1, end);

		const segments = middle.split(",");
		out.push({ mapping: segments.map(ExtractName), href });
	}

	return out;
}

function ExtractName (str: string): ImportName {
	const parts = CutString(str, " as ");

	if (parts[1].length !== 0) return { name: parts[1].trim(), original: parts[0].trim() };

	const name = parts[0].trim();
	return { name, original: name };
}





function BuildServerManifest(type: string, imported: Imports) {
	const names = new Array<string>();
	for (const imp of imported) {
		if (Array.isArray(imp.mapping)) names.push(...imp.mapping.map(x => x.name))
		else names.push(imp.mapping.name)
	}

	let out = "/* eslint-disable @typescript-eslint/no-explicit-any */\n";
	for (const imp of imported) {
		out += "import ";

		if (!Array.isArray(imp.mapping)) {
			out += ImportNameSource(imp.mapping) + " ";
		} else {
			let first = true;
			out += "{ ";

			for (const name of imp.mapping) {
				if (first) first = false;
				else out += ", ";
				out += ImportNameSource(name);
			}

			out += " } ";
		}

		out += `from "${imp.href}";\n`;
	}

	out += `\nimport { Style } from "htmx-router/css";\n`
		+ `const island = new Style("i", ".this{display:contents;}\\n").name;\n\n`
		+ "type FirstArg<T> = T extends (arg: infer U, ...args: any[]) => any ? U : never;\n"
		+ "function mount(name: string, json: string, ssr?: JSX.Element) {\n"
		+ "\treturn (<div className={island}>\n"
		+ `\t\t{ssr}\n`
		+ `\t\t${SafeScript(type, "`Router.mountParentWith('${name}', ${json})`")}\n`
		+ "\t</div>);\n"
		+ "}\n"
		+ "function Stringify(data: any) {\n"
		+ "\treturn JSON.stringify(data).replaceAll('<', '\\x3C');\n"
		+ "}\n\n"
		+ "const Client = {\n";

	for (const name of names) {
		out += `\t${name}: function(props: FirstArg<typeof ${name}> & { children?: JSX.Element }) {\n`
			+ `\t\tconst { children, ...data } = props;\n`
			+ `\t\treturn mount("${name}", Stringify(data), children);\n`
			+ `\t},\n`
	}

	out += "}\nexport default Client;";

	return out;
}

function ImportNameSource(name: ImportName) {
	if (name.original === name.name) return name.name;
	return `${name.original} as ${name.name}`;
}

function SafeScript(type: string, script: string) {
	switch (type) {
		case "react": return `<script dangerouslySetInnerHTML={{__html: ${script}}}></script>`
		default: return `<script>${script}</script>`
	}
}






function BuildClientManifest(type: string, imports: Imports) {
	const bind = binding[type as keyof typeof binding];
	if (!bind) throw new Error(`Unsupported client adapter ${type}`);

	let out = "/* eslint-disable @typescript-eslint/no-explicit-any */\n\n";

	out += "const client = {\n";
	for (const imported of imports) {
		if (Array.isArray(imported.mapping)) {
			for (const map of imported.mapping) {
				out += `\t${map.name}: async (element: HTMLElement, props: any) => {\n`
					+ `\t\tconst C = (await import("${imported.href}")).${map.original};\n`
					+ bind.mount
					+ `\n\t},\n`;
			}
		} else {
			out += `\t${imported.mapping.name}: async (element: HTMLElement, props: any) => {\n`
				+ `\t\tconst C = (await import("${imported.href}")).default;\n`
				+ bind.mount
				+ `\n\t},\n`;
		}
	}
	out += "}\nexport default client;\n"
		+ "(window as any).CLIENT = client;\n\n"

	out += bind.unmount;
	out += cleanup;

	return out;
}




const binding = {

	react: {
		mount: '\t\tconst d = await import("react-dom/client");\n'
			+ '\t\tconst r = d.createRoot(element);\n'
			+ '\t\tr.render(<C {...props} />);\n'
			+ '\t\tmounted.set(element, r);',
		unmount: `
import type { Root } from "react-dom/client";
const mounted = new Map<HTMLElement, Root>();
function Unmount(node: HTMLElement, root: Root) {
	mounted.delete(node);
	root.unmount();
}`
	}

}

const cleanup = `

const limbo = new Set<Node>();
let queued = false;
const observer = new MutationObserver((mutations) => {
	for (const mut of mutations) {
		for (const node of mut.removedNodes) limbo.add(node);
		for (const node of mut.addedNodes)   limbo.delete(node);
	}

	if (!queued) {
		queueMicrotask(Cleanup);
		queued = true;
	}
});
observer.observe(document.body, { childList: true, subtree: true });

function Cleanup() {
	queued = false;
	for (const elm of limbo) CleanNode(elm);
	limbo.clear();
}

function CleanNode(node: Node) {
	if (document.body.contains(node)) return; // it wasn't actually removed

	if (node instanceof HTMLElement) {
		const root = mounted.get(node);
		if (root) {
			console.info("unmounting", node);
			Unmount(node, root);
		}
	}

	for (const child of node.childNodes) CleanNode(child);
}`;