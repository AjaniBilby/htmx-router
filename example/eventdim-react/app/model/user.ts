import bcrypt from "bcryptjs";
import { Cookies } from "htmx-router";
import { User } from "@prisma/client";

import { CreateSession, GetSessionAuth, RefreshSession, RemoveSession } from "~/model/session";
import { KillFeedMessage } from "~/model/kill-feed";

import { CutString } from "~/util";
import { prisma } from "~/db.server";


export function HashPassword(pass: string) {
	return bcrypt.hash(pass, 10)
}


export async function GetUserID(request: Request, cookies: Cookies): Promise<number | null> {
	const session = await GetSessionAuth(request, cookies);

	if (!session) return null;

	// Check the sessionID is correct
	const found = await prisma.userSession.findFirst({
		select: { userID: true, key: true, expiry: true },
		where: {
			prefix: session.token.prefix,
			ip:     session.ip,

			// ignore expired
			expiry: { gte: new Date() },
		}
	});

	// Check session key hash matches
	if (!found || !await bcrypt.compare(session.token.key, found.key)) return null;

	await RefreshSession(cookies, session.token.prefix, found.expiry).catch(console.error);

	return found?.userID || null;
}

export async function UserLogin(request: Request, cookies: Cookies, userID: User['id']) {
	await CreateSession(request, cookies, userID);
	const user = await prisma.user.update({
		select: { display: true },
		where: { id: userID },
		data: {
			status: "LOGGED_IN",
			updatedAt: new Date()
		}
	});

	KillFeedMessage(`User ${CutString(user.display, " ")[0]} just logged in`);
}

export async function UserLogout(request: Request, cookies: Cookies) {
	const session = await GetSessionAuth(request, cookies);
	const userID = session ? await GetUserID(request, cookies) : null;

	if (session && userID) {
		const now = new Date();
		const user = await prisma.user.update({
			select: { display: true },
			where: { id: userID },
			data: {
				status: "LOGGED_OUT",
				updatedAt: now
			}
		});

		await prisma.userSession.deleteMany({
			where: { prefix: session.token.prefix }
		})

		KillFeedMessage(`User ${CutString(user.display, " ")[0]} just logged out`);
	}

	return await RemoveSession(cookies);
}