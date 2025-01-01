import { useState } from "react";

export function Counter(props: { startAt: number }) {
	const [ count, setCount ] = useState(props.startAt || 0);

	const increment = () => setCount(count+1);

	return <button onClick={increment}>Counter {count}</button>
}

// place holder to show multiple imports work
export function Bar(props: {}) {
	return <div>placeholder</div>
}