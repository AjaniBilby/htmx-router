import { useEffect, useRef } from 'react';

type VoidFunc = () => void;
export function useDebounce(delay: number, runOnClose = false) {
	const state = useRef<NodeJS.Timeout | null>(null);
	const cb = useRef<VoidFunc | null>(null);

	const poll = () => {
		if (cb.current) cb.current();
		cb.current = null;
	}

	const wait = () => new Promise<void>((res) => {
		cancel();
		cb.current = res;
		state.current = setTimeout(poll, delay);
	});

	const cancel = () => {
		if (state.current) clearTimeout(state.current);
	}

	const close = () => {
		cancel();
		if (runOnClose) poll();
	}

	useEffect(() => close, []);

	return wait;
}