import Client from "~/manifest";
import { shell } from "./$";

export async function loader() {
	return shell(<div style={{ maxWidth: "500px" }}>
		<p>Yes you can have a client island</p>

		Just make sure to import it in your client.tsx, and load the client.manifest.tsx in the browser&nbsp;

		<div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
			<Client.Counter startAt={Math.floor(Math.random()*100)}>
				<button>No yet hydrated...</button>
			</Client.Counter>

			<Client.Counter startAt={Math.floor(Math.random()*100 + 100)}>
				<button>No yet hydrated...</button>
			</Client.Counter>
		</div>
	</div>, { title: "Client Island" });
}