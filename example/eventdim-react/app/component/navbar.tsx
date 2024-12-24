import { GenericContext, StyleClass } from "htmx-router"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarDay } from "@fortawesome/free-solid-svg-icons";

import Client from "~/client";
import { GetUserID } from "~/model/user";
import { CutString } from "~/util";
import { Dynamic } from "~/router";
import { prisma } from "~/db.server";

const menu = new StyleClass("menu", `
.this .icon {
	animation: none;
}

[data-loading] .this .icon {
	animation: spin 0.6s linear infinite;
	animation-delay: .4sec;
}
`).name;

async function Account({ request, cookie, headers}: GenericContext): Promise<JSX.Element> {
	headers.set('Cache-Control', "private, max-age=120");
	const userID = await GetUserID(request, cookie);

	const user = userID ? await prisma.user.findUnique({
		select: { id: true, display: true, color: true },
		where:  { id: userID }
	}) : null
	if (!user) return <></>;

	return <a href="/user/me" style={{
		display: "flex",
		color: "inherit",
		textTransform: "capitalize",
		textDecoration: "none",
		alignItems: "center",
		gap: "10px",

		marginRight: "15px"
	}}>
		<div style={{
			backgroundPosition: "center",
			backgroundSize: "cover",
			backgroundColor: `hsl(var(--${user.color}))`,

			borderRadius: "100%",
			aspectRatio: "1",
			width: "25px",
		}}></div>

		<div>{CutString(user.display, " ")[0]}</div>
	</a>
}

export function Navbar() {
	return <nav id="menu" hx-preserve="true" className={menu} style={{
		position: "fixed",
		top: 0,
		left: 0, right: 0,
		zIndex: 5,

		display: "flex",
		height: "40px",
		backgroundColor: "hsl(var(--background))",
		borderBottom: "1px solid hsl(var(--border))",

		overflowX: "hidden",
		userSelect: "none",
	}}>
		<a href="/" style={{
			display: "flex", gap: "10px", alignItems: "center",
			marginLeft: "10px",

			fontWeight: "bold",
			textDecoration: "none",
			color: "hsl(var(--primary)"
		}}>
			<FontAwesomeIcon className="icon" icon={faCalendarDay} style={{ height: "20px"}} />
			EventDim
		</a>

		<div style={{ flexGrow: 1 }}></div>

		<Dynamic loader={Account}>
			<div style={{
				display: "flex",
				alignItems: "center",
				gap: "5px",
				viewTransitionName: "profile",
			}}>
				<div style={{
					borderRadius: "var(--radius)",
					backgroundColor: "#eee",
					height: "1em",
					width: "9ch",
				}}></div>

				<div style={{
					backgroundPosition: "center",
					backgroundSize: "cover",
					backgroundColor: "#eee",

					borderRadius: "100%",
					aspectRatio: "1",
					width: "25px",
				}}></div>
			</div>
		</Dynamic>

		<div style={{
			display: "flex",
			gap: "10px"
		}}>
			<div style={{ display: "flex", alignItems: "center", justifyContent: "center", aspectRatio: 1 }}>
				<Client.ThemeSwitcher />
			</div>
		</div>

		<KillFeed />
	</nav>
}


function KillFeed() {
	return <div
		style={{
			position: "fixed", top: "40px", right: 0,
			padding: "5px 10px",

			userSelect: "none", pointerEvents: "none",
			color: "hsl(var(--muted-foreground))"
		}}
		hx-ext="sse"
		sse-connect="/kill-feed"
		sse-swap="update"
		hx-swap="beforeend"
	></div>
}