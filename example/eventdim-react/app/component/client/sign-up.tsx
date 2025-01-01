
import { FormEvent, useRef, useState } from "react";

import { NewPassword } from "~/component/client/new-password";
import { ErrorBox } from "~/component/error-box";

export function SignUp(props: { swapMode: () => void }) {
	const [ active, setActive ] = useState(false);
	const [ error, setError ] = useState("");

	const submit = async (ev: FormEvent<HTMLFormElement>) => {
		ev.stopPropagation();
		ev.preventDefault();

		const formData = new FormData(ev.currentTarget);

		setActive(true);
		try {
			const req = await fetch("/auth/sign-up", { method: "POST", body: formData });
			if (!req.ok) throw new Error(await req.text());

			// refresh
			window.location.pathname = "";
		} catch (e) {
			if (e instanceof Error) setError(e.message);
			else setError(String(e));
		}

		setActive(false);
	}

	return <form style={{
		padding: ".4em .8em",
		textAlign: "center",
		fontSize: "1rem", // ignore any local font effects of where we're embedded
	}} onSubmit={submit}>
		<h1 style={{ marginBlock: "0 .6em" }}>Sign up</h1>

		<input
			style={{ marginTop: "5px" }}
			name="display"
			placeholder="display name"
			autoCapitalize="off"
			autoCorrect="off"
			required
		></input>

		<input
			style={{ marginTop: "5px" }}
			name="username"
			placeholder="username"
			pattern="^[a-z]+(\.[a-z]+)*$"
			autoCapitalize="off"
			autoCorrect="off"
			required
		></input>

		<NewPassword style={{ marginTop: "5px" }}/>

		{ error && <ErrorBox>{error}</ErrorBox>}

		<button
			style={{ display: "block", marginInline: "auto", marginTop: "25px" }}
			disabled={active}
		>Register</button>

		<div onClick={props.swapMode} style={{
			display: "block",
			marginTop: "20px",
			marginInline: "auto",
			textDecoration: "none",
			color: "hsl(var(--muted-foreground))",
			fontSize: ".8em",
			cursor: "pointer"
		}}>login</div>
	</form>;
}