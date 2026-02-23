export type EventType = string | symbol;

export type Handler<T = unknown> = (event: T) => void;
export type WildcardHandler<T = Record<string, unknown>> = (
	type: keyof T,
	event: T[keyof T],
) => void;

export type EventHandlerList<T = unknown> = Array<Handler<T>>;
export type WildCardEventHandlerList<T = Record<string, unknown>> = Array<
	WildcardHandler<T>
>;

export type EventHandlerMap<Events extends Record<EventType, unknown>> = Map<
	keyof Events | '*',
	EventHandlerList<Events[keyof Events]> | WildCardEventHandlerList<Events>
>;

export interface Emitter<Events extends Record<EventType, unknown>> {
	all: EventHandlerMap<Events>;

	on<Key extends keyof Events>(type: Key, handler: Handler<Events[Key]>): void;
	on(type: '*', handler: WildcardHandler<Events>): void;

	off<Key extends keyof Events>(
		type: Key,
		handler?: Handler<Events[Key]>,
	): void;
	off(type: '*', handler: WildcardHandler<Events>): void;

	emit<Key extends keyof Events>(type: Key, event: Events[Key]): void;
	emit<Key extends keyof Events>(
		type: undefined extends Events[Key] ? Key : never,
	): void;
}

type GenericEventHandler<Events extends Record<EventType, unknown>> =
	| Handler<Events[keyof Events]>
	| WildcardHandler<Events>;

const on = <Events extends Record<EventType, unknown>>(
	all: EventHandlerMap<Events>,
) => {
	return <Key extends keyof Events>(
		type: Key,
		handler: GenericEventHandler<Events>,
	): void => {
		const handlers = all.get(type) as
			| Array<GenericEventHandler<Events>>
			| undefined;
		if (handlers) {
			handlers.push(handler);
			return;
		}
		all.set(type, [handler] as EventHandlerList<Events[keyof Events]>);
	};
};

const off = <Events extends Record<EventType, unknown>>(
	all: EventHandlerMap<Events>,
) => {
	return <Key extends keyof Events>(
		type: Key,
		handler?: GenericEventHandler<Events>,
	): void => {
		const handlers = all.get(type) as
			| Array<GenericEventHandler<Events>>
			| undefined;
		if (!handlers) return;

		if (!handler) {
			all.set(type, []);
			return;
		}

		handlers.splice(handlers.indexOf(handler) >>> 0, 1);
	};
};

const emit = <Events extends Record<EventType, unknown>>(
	all: EventHandlerMap<Events>,
) => {
	return <Key extends keyof Events>(type: Key, evt?: Events[Key]): void => {
		const handlers = all.get(type);
		if (handlers) {
			const list = (handlers as EventHandlerList<Events[keyof Events]>).slice();
			for (let i = 0; i < list.length; i++) {
				list[i]?.(evt as Events[keyof Events]);
			}
		}

		const wildcardHandlers = all.get('*');
		if (wildcardHandlers) {
			const list = (
				wildcardHandlers as WildCardEventHandlerList<Events>
			).slice();
			for (let i = 0; i < list.length; i++) {
				list[i]?.(type, evt as Events[keyof Events]);
			}
		}
	};
};

export default function mitt<Events extends Record<EventType, unknown>>(
	map?: EventHandlerMap<Events>,
): Emitter<Events> {
	const all = map || new Map();

	return {
		all,
		on: on(all),
		off: off(all),
		emit: emit(all),
	};
}
