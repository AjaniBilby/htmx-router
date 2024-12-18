import { shell } from "./$";

export const parameters = {};

export async function loader() {
	return shell(<div style={{ maxWidth: "500px" }}>
		<p>But to buy the big rock you need a login</p>
		<p>To have logins, means dynamic content, per user - so the page is no longer fully cacheable, just because you want the user's name at the top of the screen</p>
		<p>All of this beautiful cacheable ocean is ruined by one <a href="/island">tiny island</a></p>
	</div>, { title: "Dilemma"});
}