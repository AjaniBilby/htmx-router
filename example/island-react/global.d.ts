import { ReactNode } from 'react';

declare global {
	namespace JSX {
		type Element = ReactNode;
		interface HTMLAttributes extends HtmxAttributes {}
	}
}