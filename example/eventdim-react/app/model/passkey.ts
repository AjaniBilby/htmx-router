import crypto from 'crypto';
import { Cookies } from 'htmx-router';
import { decode } from 'cbor2'

import { HashPassword } from '~/model/user';

import { GetChallenge, SetChallenge } from '~/model/session';
import { prisma } from '~/db.server';

export async function StartChallenge(cookie: Cookies) {
	const challenge = crypto.randomBytes(32);
	await SetChallenge(cookie, challenge.toString('base64url'))

	return challenge;
}

export { GetChallenge };



// https://webauthn.guide/#registration
type AttestationObject = {
	fmt: string,
	attStmt: {
		sig: Uint8Array
		x5c: Uint8Array[]
	}
	authData: Uint8Array
}
export async function GetPublicKey(credentialID: string, attestation: Uint8Array, clientData: Uint8Array) {
	const attestationObject: AttestationObject = decode(Uint8Array.from(attestation));

	const { sig, x5c } = attestationObject.attStmt;

	const authData = attestationObject.authData;
	if (!(authData instanceof Uint8Array)) throw new Error("Malformed auth-data");

	const clientDataHash = new Uint8Array(crypto.createHash('SHA256').update(clientData).digest());

	const certificate = new crypto.X509Certificate(
		"-----BEGIN CERTIFICATE-----\n"
		+ Buffer.from(x5c[0]).toString('base64') // x5c Certificate DER
		+ "\n-----END CERTIFICATE-----"
	);

	const verified = crypto.createVerify('SHA256')
		.update(authData)
		.update(clientDataHash)
		.verify(certificate.publicKey, sig);
	if (!verified) throw new Error("Invalid Certificate");

	// get the length of the credential ID
	const dataView = new DataView(new ArrayBuffer(2));
	const idLenBytes = authData.slice(53, 55);
	idLenBytes.forEach((value, index) => dataView.setUint8(index, value));
	const credentialIdLength = dataView.getUint16(0, false); // bigEndian
	const credentialId = Buffer.from(authData.slice(55, 55 + credentialIdLength)).toString('base64url');
	if (credentialID !== credentialId) throw new Error("Authdata encoding error, credentialID miss-match");

	const publicKeyBytes = authData.slice(55 + credentialIdLength);
	const publicKeyObject = decode(publicKeyBytes) as Map<number, Uint8Array>;

	const x = publicKeyObject.get(-2);
	const y = publicKeyObject.get(-3);
	if (!x || !y) throw new Error("Missing keys");

	const publicKey = crypto.createPublicKey({
		format: "jwk",
		key: {
			kty: 'EC',
			crv: 'P-256',
			x: Buffer.from(x).toString('base64url'),
			y: Buffer.from(y).toString('base64url'),
			alg: 'ES256',
			ext: true
		}
	});

	return publicKey.export({
		type: "spki",
		format: "pem"
	}) as string;
}



export async function BindHardware(request: Request, cookie: Cookies) {
	const body = await request.json();
	if (typeof body.userID !== "number") throw new Response("Missing userID", {
		statusText: "Bad Request",
		status: 400
	});

	if (typeof body.name !== "string") throw new Response("Missing key name", {
		statusText: "Bad Request",
		status: 400
	});
	if (body.name.length > 50) throw new Response("Hardware key name too long", {
		statusText: "Bad Request",
		status: 400
	});

	if (!Array.isArray(body.attestationObject)) throw new Response("Malformed body, no attestationObject", {
		statusText: "Bad Request",
		status: 400
	});
	if (!Array.isArray(body.clientDataJSON)) throw new Response("Malformed body, no clientDataJSON", {
		statusText: "Bad Request",
		status: 400
	});
	const clientDataBytes = Uint8Array.from(body.clientDataJSON);

	const credentialID = body.credentialID;
	if (typeof credentialID !== "string") throw new Response("Missing credential ID", {
		statusText: "Bad Request",
		status: 400
	});

	const publicKeyAlgorithm = body.publicKeyAlgorithm;
	if (typeof publicKeyAlgorithm !== "number") throw new Response("Missing publicKeyAlgorithm", {
		statusText: "Bad Request",
		status: 400
	});
	if (publicKeyAlgorithm !== -7) throw new Response(`Unsupported algorithm ${publicKeyAlgorithm}`, {
		statusText: "Bad Request",
		status: 400
	});


	{ // Collision Checks
		const nameCollision = await prisma.passKey.findFirst({
			select: { id: true },
			where: {
				userID: body.userID,
				name: body.name
			}
		});
		if (nameCollision) throw new Response("Hardware key name already in use for user", {
			statusText: "Bad Request",
			status: 400
		});

		const idCollision = await prisma.passKey.findFirst({
			where: { credentialID },
			include: {
				user: { select: { name: true } }
			}
		});
		if (idCollision) throw new Response(`Credential ID collision with ${idCollision.user.name}'s ${idCollision.name}`, {
			statusText: "Bad Request",
			status: 400
		});
	}



	const utf8Decoder = new TextDecoder('utf-8');
	const clientDataJson = utf8Decoder.decode(clientDataBytes);
	const clientData = JSON.parse(clientDataJson);
	if (clientData.challenge != await GetChallenge(cookie)) throw new Response("Challenge miss-match", {
		statusText: "Bad Request",
		status: 400
	});

	const publicKey = await GetPublicKey(
		credentialID,
		Uint8Array.from(body.attestationObject),
		clientDataBytes
	);

	const auth = await prisma.passKey.create({
		data: {
			userID: body.userID,
			name:   body.name,

			credentialID,
			publicKey: publicKey
		}
	});


	return { success: true };
}


export async function UnbindHardware(request: Request, userID: number) {
	const body = await request.json();
	if (typeof body.authID !== "number") throw new Response("Missing authID", {
		statusText: "Bad Request",
		status: 400
	});

	const auth = await prisma.passKey.delete({
		where: { id: body.authID }
	});

	return { success: true };
}


export async function GenerateUserOTPToken(userID: number) {
	const identifier = Buffer.alloc(4);
	identifier.writeInt32LE(userID);

	const code = crypto.randomBytes(32-4);
	return {
		hash: await HashPassword(code.toString("base64url")),
		token: [ ...identifier, ...code ],
	}
}

export function DecodeUserOTPToken(buffer: Buffer) {
	const userID = buffer.readInt32LE(0);
	return { userID, code: buffer.toString("base64url", 4) }
}