
import { MouseEvent, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAddressCard } from "@fortawesome/free-solid-svg-icons";

import type * as HardwareAPI from "~/routes/auth/login/passkey/$username";

import { ErrorBox } from "~/component/error-box";


export function Login(props: { swapMode: () => void }) {
	const [ mode, setMode ] = useState<"passkey" | "password">("passkey");
	const [ active, setActive ] = useState(false);
	const [ error, setError ] = useState("");

	const password = async (ev: MouseEvent) => {
		ev.stopPropagation();
		ev.preventDefault();

		if (!nameRef.current) return;
		if (!nameRef.current.value) {
			alert("Please enter a username");
			nameRef.current.focus();
			return;
		}

		if (!passRef.current) return;
		if (!passRef.current.value) {
			alert("Please enter a password");
			passRef.current.focus();
			return;
		}

		setActive(true);
		try {
			await PasswordLogin(nameRef.current.value, passRef.current.value);
			// window.location.pathname = "";
		} catch (e) {
			if (e instanceof Error) setError(e.message);
			else setError(String(e));
		}

		setActive(false);
	}

	const passkey = async (ev: MouseEvent) => {
		ev.stopPropagation();
		ev.preventDefault();

		if (!nameRef.current) return;
		if (!nameRef.current.value) {
			alert("Please enter a username");
			nameRef.current.focus();
			return;
		}

		setActive(true);
		try {
			await PassKeyLogin(nameRef.current.value);
			// window.location.pathname = "";
		} catch (e) {
			console.error(e);
			if (e instanceof Error) setError(e.message);
			else setError(String(e));
		}

		setActive(false);
	}

	const nameRef = useRef<HTMLInputElement>(null);
	const passRef = useRef<HTMLInputElement>(null);

	return <div style={{
		padding: ".4em .8em",
		textAlign: "center",
		fontSize: "1rem", // ignore any local font effects of where we're embedded
	}}>
		<h1 style={{ marginBlock: "0 .6em" }}>Login</h1>

		<input
			ref={nameRef}
			style={{ marginTop: "5px" }}
			name="username"
			placeholder="username"
			autoCapitalize="off"
			autoCorrect="off"
			required
		></input>

		<input
			ref={passRef}
			name="password"
			type="password"
			autoComplete="password"
			placeholder="password"
			onChange={(e) => setMode(e.target.value.length > 0 ? "password" : "passkey")}
			style={{ marginTop: "5px" }}
		></input>

		{ error && <ErrorBox style={{ marginBlock: "1em" }}>{error}</ErrorBox>}

		<div style={{ marginTop: "25px" }}>
			{ mode === "passkey"
				? <button
					style={{ display: "block", marginInline: "auto" }}
					onClick={passkey}
					disabled={active}
				>Passkey&nbsp;&nbsp;<FontAwesomeIcon icon={faAddressCard} style={{ height: "16px" }} /></button>
				: <button
					style={{ display: "block", marginInline: "auto" }}
					onClick={password}
					disabled={active}
				>Login</button>
			}
		</div>

		<div onClick={props.swapMode} style={{
			display: "block",
			marginTop: "20px",
			marginInline: "auto",
			textDecoration: "none",
			color: "hsl(var(--muted-foreground))",
			fontSize: ".8em",
			cursor: "pointer"
		}}>sign up</div>
	</div>;
}

async function PasswordLogin(username: string, password: string) {
	const formData = new FormData();
	formData.set("username", username);
	formData.set("password", password);

	const req = await fetch("/auth/login/password", { method: "POST", body: formData });
	if (!req.ok) throw new Error(await req.text());

	return true;
}


async function PassKeyLogin(username: string) {
	const req = await fetch(`/auth/login/passkey/${username}`, { method: "GET" });
	if (!req.ok) throw new Error(await req.text());

	const data = await req.json() as HardwareAPI.Loader;
	if (!data) return;

	const assertion = await navigator.credentials.get({
		publicKey: {
			challenge: Uint8Array.from(data.challenge),
			allowCredentials: data.allowCredentials.map(x => ({
				id: Uint8Array.from(x.id),
				type: x.type,
				transports: x.transports
			})),
			timeout: data.timeout
		} as CredentialRequestOptions['publicKey']
	});

	if (!assertion) throw new Error("Failed assertion");

	const key = assertion as PublicKeyCredential;
	const response = key.response as AuthenticatorAssertionResponse;

	const req2 = await fetch(`/auth/login/passkey`, {
		method: "POST",
		body: JSON.stringify({
			credentialID: key.id,
			clientData: [...new Uint8Array(response.clientDataJSON)],

			authenticatorData: [...new Uint8Array(response.authenticatorData)],
			signature: [...new Uint8Array(response.signature)]
		})
	});
	if (!req2.ok) throw new Error(await req2.text());

	return true;
}