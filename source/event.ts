import { Singleton } from './util/singleton';

declare global {
	// Minimal shim for Deno global
	const Deno: {
		build: { os: 'windows' | 'linux' | 'darwin' | string };
		addSignalListener: (signal: string, handler: () => void) => void;
	} | undefined;
}

export class ShutdownEvent extends CustomEvent<{ signal: string }> {
	constructor(signal: string) {
		super('shutdown', { detail: { signal } });
	}
}

/**
 * Controller for handling graceful shutdowns across Windows, Linux, and Browsers.
 *
 * @example
 * ```ts
 * Lifecycle.addEventListener('shutdown', (e) => {
 *   console.log('Stopping because of:', e.detail.signal);
 *   server.close();
 * });
 * ```
 */
class LifecycleController extends EventTarget {
	#shuttingDown = false;

	constructor() {
		super();
		this.#bindEvents();
	}

	isShuttingDown() { return this.#shuttingDown; }

	// Bind to whatever environment we are running in
	#bindEvents() {
		const trigger = (sig: string) => this.#trigger(sig);

		if (globalThis.window && globalThis.window.addEventListener) {
			// BROWSER: Tab closing / Refreshing
			globalThis.window.addEventListener('beforeunload', () => trigger('BEFOREUNLOAD'));
		}

		if (process) {
			// process.on('SIGINT',  () => trigger('SIGINT'));
			process.on('SIGTERM', () => trigger('SIGTERM'));
			process.on('SIGHUP',  () => trigger('SIGHUP'));
		}

		if (Deno) {
			if (Deno.build.os !== "windows") {
				Deno.addSignalListener('SIGTERM', () => trigger('SIGTERM'));
			}
			Deno.addSignalListener("SIGHUP", () => trigger('SIGHUP'));
			// Deno.addSignalListener("SIGINT", () => trigger('SIGINT'));
		}
	}

	#trigger(signal: string) {
		if (this.#shuttingDown) return;
		this.#shuttingDown = true;

		console.log(`\n🛑 Shutdown Signal received: ${signal}`);

		this.dispatchEvent(new ShutdownEvent(signal));
	}
}

export const Lifecycle = Singleton('htmx-router-lifecycle', () => new LifecycleController());