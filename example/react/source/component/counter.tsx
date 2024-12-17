import { useState } from "react";

export function Counter() {
	const [ count, setCount ] = useState(0);

	const increment = () => setCount(count+1);

	return <button onClick={increment}>Counter {count}</button>
}