import Client from "~/client";
import { shell } from "./$";

export async function loader() {
	return shell(<div style={{ maxWidth: "500px" }}>
		<p>Yes you can have a client island</p>

		Just make sure to import it in your client.tsx, and load the client.manifest.tsx in the browser&nbsp;

		<Client.Counter>
			<button>No yet hydrated...</button>
		</Client.Counter>
	</div>, { title: "Client Island" });
}