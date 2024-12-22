import { json, RouteContext, TypedJson } from "htmx-router";

import { StartChallenge } from "~/model/passkey";
import { prisma } from "~/db.server";


export const parameters = {
	username: String
}

export async function loader({ headers, cookie, params }: RouteContext<typeof parameters>) {
	const username = params.username?.toString() || "";
	if (!username) throw new Response("Invalid username", {
		statusText: "Bad Request",
		status: 400
	});

	const challenge = await StartChallenge(cookie);
	headers.set("Strict-Transport-Security", "max-age=604800"); // 7 days
	headers.set("Upgrade-Insecure-Requests", "1");

	const user = await prisma.user.findFirst({
		select: { id: true },
		where: { name: username }
	});

	const auths = !user ? [] : await prisma.passKey.findMany({
		select: { credentialID: true },
		where: { userID: user.id }
	});

	return json({
		challenge: [...challenge],
		allowCredentials: auths.map(x => ({
			id: [...Buffer.from(x.credentialID, "base64url")],
			type: "public-key",
			transports: ['usb', 'nfc']
		})),
		timeout: 60_000
	}, { headers });
}

export type Loader = TypedJson<Awaited<ReturnType<typeof loader>>>;