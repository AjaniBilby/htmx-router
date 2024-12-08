let atomic = 0;
function nextID () {
	const idx = atomic;
	atomic = (atomic + 1) % Number.MAX_SAFE_INTEGER;

	return `d${(idx).toString(32)}`;
}

export function Client<T>(component: (props: T & { eager: boolean }) => JSX.Element, url: string) {
	return (props: T) => {
		const forward = props as T & { eager: boolean };
		forward.eager = false;

		const id = nextID();
		const script = `const mod = await import("${url}" /* @vite-ignore */);\n`
			+ `const props = JSON.parse('${JSON.stringify(props)}');\n`
			+ `const component = typeof mod === "function" ? mod : mod["${component.constructor.name}"]\n`
			+ `ReactDom.render(component, document.getElementById("${id}"), props)`;

		forward.eager = true;

		return <div id={id}>
			{component(forward)}
			<script type="module">{script as 'safe'}</script>
		</div>
	}
}