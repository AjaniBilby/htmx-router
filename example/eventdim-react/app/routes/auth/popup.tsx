import Client from "~/manifest";
import { ServerDialog } from "~/component/dialog";
import { RoutePath } from "htmx-router";

export const route = RoutePath();

export async function loader() {
	return <ServerDialog>
		<Client.Authenticate />
	</ServerDialog>;
}