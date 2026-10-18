/**
 * Notice of the distraction detector (spec §5).
 *
 * The title and the body are built by the presentation layer, so this port never sees a
 * rule, a policy or a locale: it is handed finished strings and shows them.
 */
export interface DistractionNotice {
	readonly title: string;
	readonly body: string;
}

/**
 * OS notice channel of the detector (spec §5).
 *
 * Deliberately smaller than `IDistractionMonitor`: it has no read, and the three actions
 * of the design are absent because no plugin version compatible with the pinned Tauri
 * family can draw them on Windows (`docs/features/distraction-detector/decisions.md` §5.2).
 * The notice is therefore a faro, which is the degradation the spec already documents.
 *
 * Every method is best effort by contract: an unsupported platform, a denied permission or
 * a failing backend resolves without throwing. A lost notice must never break a focus
 * block, and it must never turn into an unhandled rejection inside the poll loop.
 */
export interface IDistractionNotifier {
	/** Verdadero sólo si la plataforma puede mostrar notificaciones del SO. */
	readonly isSupported: boolean;

	/** Asks the OS for the notification permission. Resolves true when it is granted. */
	requestPermission(): Promise<boolean>;

	/** Shows the notice. Resolves once the backend was asked, never with a rejection. */
	notify(notice: DistractionNotice): Promise<void>;
}
