import { shell } from "./$";

export const parameters = {};

export async function loader() {
	return shell(<div>
		<p>In the beginning there was nothing</p>
		<p>And nothing is really easy to cache</p>
		<p>But eventually you need <a href="/something">something</a></p>
	</div>, { title: "Nothing"});
}