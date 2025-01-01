import { GetClientEntryURL } from 'htmx-router/internal/client';
import { GetMountUrl } from 'htmx-router/internal/mount';
import { GetSheetUrl } from 'htmx-router/css';

let cache: JSX.Element | null = null;
const isProduction = process.env.NODE_ENV === "production";
const clientEntry = await GetClientEntryURL();
export function Scripts() {
	if (cache) return cache;

	const res = <>
		<link href={GetSheetUrl()} rel="stylesheet"></link>
		{ isProduction ? "" : <script type="module" src="/@vite/client"></script> }
		<script type="module" src={clientEntry}></script>
		<script src={GetMountUrl()}></script>
	</>;

	if (isProduction) cache = res;
	return res;
}