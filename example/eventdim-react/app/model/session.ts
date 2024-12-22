import { createHash, randomBytes } from "crypto";
import { CookieOptions, Cookies } from "htmx-router";

import { HashPassword } from "~/model/user";

import * as Secret from "~/util/secret";
import { GetClientIPAddress } from "~/util/network";
import { isProduction } from "~/util/index";
import { TIME_SCALE } from "~/util/time";
import { prisma } from "~/db.server";

const SESSION_LENGTH = 7 * TIME_SCALE.day / TIME_SCALE.second;
const sessionOptions: CookieOptions = {
	path: "/",
	httpOnly: true,
	sameSite: "strict",
	secure: isProduction,
	maxAge: 7 * TIME_SCALE.day / TIME_SCALE.second
};


// This isn't currently actually used
// However it could be helpful as an extra step to prevent session stealing
// Sadly safari messes with the Accepted-Language based on the file extension of the request URL
// So it's unreliable and unused
export function GetUserHash(request: Request) {
	const hash = createHash('sha256');

	const raw = (request.headers.get("Accept-Language") || "")
		+ (request.headers.get("User-Agent") || "");

	hash.update(raw);

	return hash.digest("base64url");
}


export async function GetSessionAuth(request: Request, cookies: Cookies) {
	const token = DecodeSessionToken(cookies.get("s"));

	if (!token.key) return null;
	if (token.prefix < 0) return null;

	const hash = GetUserHash(request);
	const ip = GetClientIPAddress(request);

	return { token, hash, ip };
}

export async function RemoveSession(cookies: Cookies) {
	cookies.set("session", "", { maxAge: 0 });
}



export async function GetChallenge(cookies: Cookies) {
	const val = cookies.get("c");

	if (!val) return null;

	// clear challenge on read
	cookies.set("c", "", { maxAge: 0, ...sessionOptions });

	return Secret.Decode(val.replaceAll(".", ":"));
}
export async function SetChallenge(cookies: Cookies, challenge: string) {
	cookies.set("c", Secret.Encode(challenge).replaceAll(":", "."), {
		maxAge: 30 * TIME_SCALE.minute / TIME_SCALE.minute,
		...sessionOptions
	});
}



export async function CreateSession(request: Request, cookie: Cookies, userID: number) {
	const buffer = randomBytes(40);

	cookie.set("s", buffer.toString("base64"), sessionOptions);

	const token = DecodeSession(buffer);
	const ip = GetClientIPAddress(request);

	await prisma.userSession.create({
		data: {
			prefix: token.prefix,
			key:    await HashPassword(token.key), // don't store the original key
			userID, ip: ip,

			expiry: new Date(Date.now() + SESSION_LENGTH)
		},
	});
}

export function DecodeSessionToken(session: string | null) {
	if (session === null) return { prefix: -1, key: "" };
	return DecodeSession(Buffer.from(session, "base64"));
}

function DecodeSession(buffer: Buffer) {
	if (buffer.byteLength < 5) return { prefix: -1, key: "" };
	const prefix = buffer.readInt32LE(0);
	const key = buffer.toString("base64", 4);

	return { prefix, key };
}



export async function RefreshSession(cookie: Cookies, prefix: number, expiry: Date) {
	const delta = expiry.getTime() - Date.now();

	if (delta > SESSION_LENGTH / 2) return;

	const token = cookie.get("s");
	if (token) cookie.set("s", token, sessionOptions);

	await prisma.userSession.updateMany({
		where: { prefix },
		data:  { expiry: new Date(Date.now() + SESSION_LENGTH)}
	});
}