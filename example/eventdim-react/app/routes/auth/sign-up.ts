import type { RouteContext } from "htmx-router/router";
import { text } from "htmx-router/response";

import { HashPassword, UserLogin } from "~/model/user";

import { prisma } from "~/db.server";
import { Colors } from "@prisma/client";
import { COLORS } from "~/util/color";


export async function action({ request, headers, cookie }: RouteContext) {
	headers.set("X-Caught", "true"); // don't wrap an error in HTML

	const formData = await request.formData();
	const name = String(formData.get("username"));
	const display = String(formData.get("display"));
	const pass     = String(formData.get("password-new"));
	const password = await HashPassword(pass);

	{ // check name collision
		const user = await prisma.user.findUnique({
			select: { id: true },
			where:  { name }
		});

		if (user) return text("Username already in use", { status: 400, statusText: "Bad Request" });
	}

	const user = await prisma.user.create({
		data: {
			name, display, color: "blue",
			password: { create: {
				password
			}}
		}
	});

	// Adjust color based on user ID
	await prisma.user.update({
		where: { id: user.id },
		data:  { color: COLORS[ user.id % COLORS.length ] as Colors }
	});

	await UserLogin(request, cookie, user.id);
	headers.set("Strict-Transport-Security", "max-age=604800"); // 7 days
	headers.set("Upgrade-Insecure-Requests", "1");

	return text("ok", { headers });
}