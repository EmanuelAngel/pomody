import { describe, it, expect } from 'vitest';
import { InMemoryStorage } from './in-memory-storage';

describe('InMemoryStorage', () => {
	it('supports basic Storage interface operations', () => {
		const storage = new InMemoryStorage();
		expect(storage.length).toBe(0);
		expect(storage.getItem('key1')).toBeNull();

		storage.setItem('key1', 'val1');
		expect(storage.length).toBe(1);
		expect(storage.getItem('key1')).toBe('val1');
		expect(storage.key(0)).toBe('key1');

		storage.removeItem('key1');
		expect(storage.length).toBe(0);
		expect(storage.getItem('key1')).toBeNull();

		storage.setItem('k1', 'v1');
		storage.setItem('k2', 'v2');
		expect(storage.length).toBe(2);
		storage.clear();
		expect(storage.length).toBe(0);
	});
});
