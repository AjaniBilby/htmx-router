import { CSSProperties } from "react";

export function RunningSpinner(props: { title?: string, style?: CSSProperties }) {
	return <div title={props.title || "Running"} style={{
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",

		fontFamily: "Lato, Tahoma, Geneva, sans-serif",
		fontWeight: "400",
		color: "#7f8c8d",

		width: "30px",
		height: "30px",
		borderRadius: "50%",
		background: `radial-gradient(closest-side, white 69%, transparent 70% 100%),
			conic-gradient(#16a34a 25%, hsl(var(--muted)) 0)`,

		animationName: "spin",
		animationDuration: "1s",
		animationTimingFunction: "linear",
		animationIterationCount: "infinite",
		...props.style
	}}>
		<div style={{
			width: "16px",
			height: "16px",
			backgroundColor: "#16a34a",
			borderRadius: "100%"
		}}></div>
	</div>;
}