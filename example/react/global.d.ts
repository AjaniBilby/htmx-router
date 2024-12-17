import { ReactNode } from 'react';

declare global {
	namespace JSX {
		type Element = ReactNode;
	}
}