const generic = `import { GetClientEntryURL } from 'htmx-router/internal/client';
import { GetMountUrl } from 'htmx-router/internal/mount';
import { GetSheetUrl } from 'htmx-router/css';

let cache: JSX.Element | null = null;
const clientEntry = import.meta.env.DEV
	? "/app/entry.client.ts"
	: await GetClientEntryURL();
export function Scripts() {
	if (cache) return cache;

	const res = <>
		<link href={GetSheetUrl()} rel="stylesheet"></link>
		{ import.meta.env.DEV ? <script type="module" src="/@vite/client"></script> : "" }
		<script type="module" src={clientEntry}></script>
		<script src={GetMountUrl()}></script>
	</>;

	if (import.meta.env.PROD) cache = res;
	return res;
}`;

export default {
	"*": generic
}