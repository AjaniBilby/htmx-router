import crypto from 'crypto';
import { GenericContext, text } from "htmx-router";

import { GetChallenge } from "~/model/passkey";
import { UserLogin } from '~/model/user';

import { Timeout } from '~/util';
import { prisma } from "~/db.server";


export async function action(ctx: GenericContext) {
	ctx.headers.set("X-Caught", "true");

	const [ result, ] = await Promise.all([
		HardwareAuthenticate(ctx),
		Timeout(800+200*Math.random()) // Make attempts always take at least 800ms to prevent side-channel attacks
	]);

	return result;
}


// https://webauthn.guide/#authentication
async function HardwareAuthenticate({ request, headers, cookie }: GenericContext) {
	const body = await request.json();

	const utf8Decoder = new TextDecoder('utf-8');
	const clientDataJson = Uint8Array.from(body.clientData);
	const clientData = JSON.parse(utf8Decoder.decode(clientDataJson));

	const credentialID = body.credentialID;
	if (typeof credentialID !== "string" || !credentialID) return text(
		"Invalid credentialID",
		{ statusText: "Bad Request", status: 400}
	);

	const auth = await prisma.passKey.findFirst({
		select: { userID: true, publicKey: true },
		where: { credentialID }
	});
	if (!auth || !auth.publicKey) return text("No passkeys found", { statusText: "Bad Request", status: 400});

	const challenge = await GetChallenge(cookie);
	if (!challenge || challenge !== clientData.challenge) return text("Request timeout", { statusText: "Bad Request", status: 400});

	const publicKey = crypto.createPublicKey({
		key: auth.publicKey,
		format: "pem",
		type: "spki",
	});

	const authenticatorData = new Uint8Array(body.authenticatorData);
	const clientDataHash = new Uint8Array(crypto.createHash('SHA256').update(clientDataJson).digest());
	const signature = new Uint8Array(body.signature);

	const signedData = new Uint8Array([...authenticatorData, ...clientDataHash]);

	const isVerified = crypto.createVerify('SHA256')
		.update(signedData)
		.verify(publicKey, signature);

	if (!isVerified) return text("Invalid Key", { statusText: "Bad Request", status: 400});

	await UserLogin(request, cookie, auth.userID);

	headers.set("Strict-Transport-Security", "max-age=604800"); // 7 days
	headers.set("Upgrade-Insecure-Requests", "1");

	return text("ok", { headers });
}