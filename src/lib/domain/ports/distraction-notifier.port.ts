/**
 * The three ways out of a notice (spec §5). `ack` is also what a notice that fades
 * away without an answer means, and it changes nothing.
 */
export type DistractionActionId = 'ack' | 'silence_day' | 'silence_permanent';

export interface DistractionAction {
	readonly id: DistractionActionId;
	readonly title: string;
}

/**
 * Notice of the distraction detector (spec §5).
 *
 * The title and the body are built by the presentation layer, so this port never sees a
 * rule, a policy or a locale: it is handed finished strings and shows them. `ruleId`
 * travels with the notice because that is what the action of the toast acts upon when it
 * comes back.
 */
export interface DistractionNotice {
	readonly title: string;
	readonly body: string;
	readonly ruleId: string;
}

/**
 * OS notice channel of the detector (spec §5).
 *
 * Every method is best effort by contract: an unsupported platform, a denied permission or
 * a failing backend resolves without throwing. A lost notice must never break a focus
 * block, and it must never turn into an unhandled rejection inside the poll loop.
 */
export interface IDistractionNotifier {
	/** Verdadero sólo si la plataforma puede mostrar notificaciones del SO. */
	readonly isSupported: boolean;

	/**
	 * Verdadero sólo si la plataforma dibuja los botones del aviso y los informa de vuelta.
	 * En Windows eso empieza en `tauri-plugin-notification` 2.6.0; en la 2.4.0 que este repo
	 * tomaba antes no existía, y el aviso era un faro (`decisions.md` §5.2).
	 */
	readonly supportsActions: boolean;

	/** Declares the notice's actions under one type. Safe to call more than once. */
	registerActions(actions: readonly DistractionAction[]): Promise<void>;

	/** Asks the OS for the notification permission. Resolves true when it is granted. */
	requestPermission(): Promise<boolean>;

	/** Shows the notice. Resolves once the backend was asked, never with a rejection. */
	notify(notice: DistractionNotice): Promise<void>;

	/**
	 * Subscribes to the user picking one of the registered actions.
	 *
	 * The handler receives the action and the rule the notice was about; anything the
	 * platform reports that is not one of the three registered ids (including a tap on the
	 * notice itself) is dropped rather than guessed. Returns the unsubscribe.
	 */
	onAction(handler: (actionId: DistractionActionId, ruleId: string) => void): () => void;
}
