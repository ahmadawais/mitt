import { beforeEach, describe, expect, it, vi } from 'vitest';
import mitt, { type Emitter, type EventHandlerMap } from '../src/index';

describe('mitt', () => {
	it('should default export be a function', () => {
		expect(typeof mitt).toBe('function');
	});

	it('should accept an optional event handler map', () => {
		expect(() => mitt(new Map())).not.toThrow();
		const map = new Map();
		const a = vi.fn();
		const b = vi.fn();
		map.set('foo', [a, b]);
		const events = mitt<{ foo: undefined }>(map);
		events.emit('foo');
		expect(a).toHaveBeenCalledOnce();
		expect(b).toHaveBeenCalledOnce();
	});
});

describe('mitt#', () => {
	const eventType = Symbol('eventType');
	type Events = {
		foo: unknown;
		constructor: unknown;
		FOO: unknown;
		bar: unknown;
		Bar: unknown;
		'baz:bat!': unknown;
		'baz:baT!': unknown;
		Foo: unknown;
		[eventType]: unknown;
	};
	let events: EventHandlerMap<Events>;
	let inst: Emitter<Events>;

	beforeEach(() => {
		events = new Map();
		inst = mitt(events);
	});

	describe('properties', () => {
		it('should expose the event handler map', () => {
			expect(inst.all).toBeInstanceOf(Map);
		});
	});

	describe('on()', () => {
		it('should be a function', () => {
			expect(typeof inst.on).toBe('function');
		});

		it('should register handler for new type', () => {
			const foo = () => {};
			inst.on('foo', foo);
			expect(events.get('foo')).toEqual([foo]);
		});

		it('should register handlers for any type strings', () => {
			const foo = () => {};
			inst.on('constructor', foo);
			expect(events.get('constructor')).toEqual([foo]);
		});

		it('should append handler for existing type', () => {
			const foo = () => {};
			const bar = () => {};
			inst.on('foo', foo);
			inst.on('foo', bar);
			expect(events.get('foo')).toEqual([foo, bar]);
		});

		it('should NOT normalize case', () => {
			const foo = () => {};
			inst.on('FOO', foo);
			inst.on('Bar', foo);
			inst.on('baz:baT!', foo);

			expect(events.get('FOO')).toEqual([foo]);
			expect(events.has('foo')).toBe(false);
			expect(events.get('Bar')).toEqual([foo]);
			expect(events.has('bar')).toBe(false);
			expect(events.get('baz:baT!')).toEqual([foo]);
		});

		it('can take symbols for event types', () => {
			const foo = () => {};
			inst.on(eventType, foo);
			expect(events.get(eventType)).toEqual([foo]);
		});

		it('should add duplicate listeners', () => {
			const foo = () => {};
			inst.on('foo', foo);
			inst.on('foo', foo);
			expect(events.get('foo')).toEqual([foo, foo]);
		});
	});

	describe('off()', () => {
		it('should be a function', () => {
			expect(typeof inst.off).toBe('function');
		});

		it('should remove handler for type', () => {
			const foo = () => {};
			inst.on('foo', foo);
			inst.off('foo', foo);
			expect(events.get('foo')).toEqual([]);
		});

		it('should NOT normalize case', () => {
			const foo = () => {};
			inst.on('FOO', foo);
			inst.on('Bar', foo);
			inst.on('baz:bat!', foo);

			inst.off('FOO', foo);
			inst.off('Bar', foo);
			inst.off('baz:baT!', foo);

			expect(events.get('FOO')).toEqual([]);
			expect(events.has('foo')).toBe(false);
			expect(events.get('Bar')).toEqual([]);
			expect(events.has('bar')).toBe(false);
			expect(events.get('baz:bat!')).toHaveLength(1);
		});

		it('should remove only the first matching listener', () => {
			const foo = () => {};
			inst.on('foo', foo);
			inst.on('foo', foo);
			inst.off('foo', foo);
			expect(events.get('foo')).toEqual([foo]);
			inst.off('foo', foo);
			expect(events.get('foo')).toEqual([]);
		});

		it('off("type") should remove all handlers of the given type', () => {
			inst.on('foo', () => {});
			inst.on('foo', () => {});
			inst.on('bar', () => {});
			inst.off('foo');
			expect(events.get('foo')).toEqual([]);
			expect(events.get('bar')).toHaveLength(1);
			inst.off('bar');
			expect(events.get('bar')).toEqual([]);
		});
	});

	describe('emit()', () => {
		it('should be a function', () => {
			expect(typeof inst.emit).toBe('function');
		});

		it('should invoke handler for type', () => {
			const event = { a: 'b' };

			inst.on('foo', (one, two?: unknown) => {
				expect(one).toEqual(event);
				expect(two).toBeUndefined();
			});

			inst.emit('foo', event);
		});

		it('should NOT ignore case', () => {
			const onFoo = vi.fn();
			const onFOO = vi.fn();
			events.set('Foo', [onFoo]);
			events.set('FOO', [onFOO]);

			inst.emit('Foo', 'Foo arg');
			inst.emit('FOO', 'FOO arg');

			expect(onFoo).toHaveBeenCalledOnce();
			expect(onFoo).toHaveBeenCalledWith('Foo arg');
			expect(onFOO).toHaveBeenCalledOnce();
			expect(onFOO).toHaveBeenCalledWith('FOO arg');
		});

		it('should invoke * handlers', () => {
			const star = vi.fn();
			const ea = { a: 'a' };
			const eb = { b: 'b' };

			events.set('*', [star]);

			inst.emit('foo', ea);
			expect(star).toHaveBeenCalledOnce();
			expect(star).toHaveBeenCalledWith('foo', ea);
			star.mockClear();

			inst.emit('bar', eb);
			expect(star).toHaveBeenCalledOnce();
			expect(star).toHaveBeenCalledWith('bar', eb);
		});
	});
});
