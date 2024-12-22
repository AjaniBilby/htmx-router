import { faMoon, faSun } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";
import { TransitionStart } from "~/util/transition.client";

export function ThemeSwitcher() {
	const [ isDark, setDark ] = useState(false);

	const toggleTheme = async () => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const g = window as any;
		await TransitionStart();
		const theme: string = g.Router?.theme?.toggle();
		setDark(theme == "dark");
	}

	useEffect(() => {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const g = window as any;
		const theme: string = g.Router?.theme?.get();
		setDark(theme == "dark");
	}, []);

	return <FontAwesomeIcon icon={isDark ? faSun : faMoon} title="Switch theme" style={{
		color: "hsl(var(--muted-foreground))",
		cursor: "pointer",
		padding: "8px 10px",
		borderRadius: "100%",
		height: "20px"
	}} onMouseDown={toggleTheme} />;
}