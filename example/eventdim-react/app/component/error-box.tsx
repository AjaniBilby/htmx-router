import { CSSProperties } from "react";

export function ErrorBox(props: {
	children: React.ReactNode,
	style?: CSSProperties
}) {
	return <div className="card" style={{
		whiteSpace: "pre-wrap",
		padding: "1rem",
		color: "hsl(var(--destructive))",
		...props.style
	}}>
		{props.children}
	</div>;
}