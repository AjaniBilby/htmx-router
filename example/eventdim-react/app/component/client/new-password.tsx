import zxcvbn from "zxcvbn";
import { useState, ChangeEvent, CSSProperties, useRef, useEffect } from 'react';

import { useDebounce } from '~/util/hook';


export function NewPassword(props: {
	style?: CSSProperties,
	inputRef?: React.RefObject<HTMLInputElement>
}) {
	const matchTimeout = useRef<NodeJS.Timeout | null>(null);
	const [ matching, setMatching ] = useState("");

	const debounce = useDebounce(100);
	const onChange = async (event: ChangeEvent<HTMLInputElement>) => {
		event.preventDefault();

		await debounce();
		setMatching(event.target.value)
	};

	const quality = zxcvbn(matching);

	useEffect(() => {
		return () => {
			if (matchTimeout.current) clearTimeout(matchTimeout.current);
		}
	}, []);

	return <>
		<input
			id="password-new"
			name="password-new"
			type="password"
			style={props.style}
			ref={props.inputRef}
			placeholder="password"
			autoComplete="new-password"
			onChange={onChange}
		/>
		{matching && <>
			<div style={{
				margin: "3px 0px 3px 5px",
				fontSize: "0.8em"
			}}>
				Crack Time: {quality.crack_times_display.offline_slow_hashing_1e4_per_second}
			</div>
		</>}
	</>;
}
