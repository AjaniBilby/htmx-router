import bcrypt from "bcryptjs";
import { GenericContext, text } from "htmx-router";

import { UserLogin } from "~/model/user";

import { Timeout } from "~/util";
import { prisma } from "~/db.server";


export async function action(ctx: GenericContext) {
	ctx.headers.set("X-Caught", "true");

	const [ result, ] = await Promise.all([
		PasswordLogin(ctx),
		Timeout(800+200*Math.random()) // Make attempts always take at least 800ms to prevent side-channel attacks
	]);

	return result;
}

async function PasswordLogin({ request, headers, cookie }: GenericContext) {
	const formData = await request.formData();
	const username = String(formData.get("username"));
	const password = String(formData.get("password"));

	const user = await prisma.user.findUnique({
		select: { id: true },
		where: { name: username }
	});

	if (!user) return text("Invalid username", { status: 400, statusText: "Bad Request" });

	const passwords = await prisma.userPassword.findMany({
		where: { userID: user.id }
	});
	const matches = await Promise.all(passwords.map(x => bcrypt.compare(password, x.password)));
	if (!matches.some(x => x)) return text("Invalid password", { status: 400, statusText: "Bad Request" });

	await UserLogin(request, cookie, user.id);
	headers.set("Strict-Transport-Security", "max-age=604800"); // 7 days
	headers.set("Upgrade-Insecure-Requests", "1");

	return text("ok", { headers });
}