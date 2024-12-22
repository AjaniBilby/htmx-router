import { CSSProperties, ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";

export function ServerDialog(props: { children: ReactNode, style?: CSSProperties }) {
	return <div className="dialog" style={{
		display: "flex",
		alignItems: "center",
		justifyContent: "center",

		backgroundColor: "rgba(0,0,0,.2)",
		position: "fixed",
		inset: "0",

		zIndex: "10",
	}}>
		<div style={{
			position: "relative",
			backgroundColor: "hsl(var(--popover))",
			borderRadius: "var(--radius)",
			color: "hsl(var(--popover-foreground))",

			overflowY: "auto",
			maxHeight: "90vh",

			maxWidth: "425px",
			padding: "1.5rem",
			width: "100%",
			...props.style
		}}>
			<FontAwesomeIcon style={{
				position: "absolute",
				top: "1em",
				right: "1em",

				cursor: "pointer",

				color: "hsl(var(--muted-foreground))",
				height: "18px",
			}} icon={faXmark} hx-get="/empty" hx-target="closest .dialog" hx-swap="outerHTML"/>

			{props.children}
		</div>
	</div>
}