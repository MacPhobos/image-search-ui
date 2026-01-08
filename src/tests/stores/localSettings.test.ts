import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock localStorage
let localStorageMock: Record<string, string> = {};

const localStorageApi = {
	getItem: (key: string) => localStorageMock[key] ?? null,
	setItem: (key: string, value: string) => {
		localStorageMock[key] = value;
	},
	removeItem: (key: string) => {
		delete localStorageMock[key];
	},
	clear: () => {
		localStorageMock = {};
	},
	key: (index: number) => {
		const keys = Object.keys(localStorageMock);
		return keys[index] ?? null;
	},
	get length() {
		return Object.keys(localStorageMock).length;
	}
};

// Install localStorage mock globally
Object.defineProperty(globalThis, 'localStorage', {
	value: localStorageApi,
	writable: true
});

// Mock $app/environment to enable browser mode
vi.mock('$app/environment', () => ({
	browser: true
}));

// Import store after mocks are set up
import { localSettings } from '$lib/stores/localSettings.svelte';

describe('localSettings store', () => {
	beforeEach(() => {
		// Clear localStorage and cache before each test
		localStorageMock = {};
		localSettings.clearAll();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('get()', () => {
		it('returns default when setting not stored', () => {
			const result = localSettings.get('test.key', 'default-value');

			expect(result).toBe('default-value');
		});

		it('returns stored value when present in localStorage', () => {
			// Pre-populate localStorage
			localStorage.setItem('image-search.test.key', JSON.stringify('stored-value'));

			const result = localSettings.get('test.key', 'default-value');

			expect(result).toBe('stored-value');
		});

		it('caches retrieved value for subsequent calls', () => {
			localStorage.setItem('image-search.test.key', JSON.stringify('cached-value'));

			// First call loads from localStorage
			const result1 = localSettings.get('test.key', 'default-value');
			expect(result1).toBe('cached-value');

			// Change localStorage after cache is populated
			localStorage.setItem('image-search.test.key', JSON.stringify('new-value'));

			// Second call should return cached value, not the new localStorage value
			const result2 = localSettings.get('test.key', 'default-value');
			expect(result2).toBe('cached-value');
		});

		it('handles complex objects (nested objects, arrays)', () => {
			const complexObject = {
				name: 'test',
				nested: { foo: 'bar', count: 42 },
				items: ['a', 'b', 'c']
			};

			localStorage.setItem('image-search.complex', JSON.stringify(complexObject));

			const result = localSettings.get('complex', {});

			expect(result).toEqual(complexObject);
		});

		it('handles JSON parse errors gracefully and returns default', () => {
			// Set invalid JSON
			localStorage.setItem('image-search.invalid', 'not-valid-json{');

			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			const result = localSettings.get('invalid', 'fallback-value');

			expect(result).toBe('fallback-value');
			expect(consoleWarnSpy).toHaveBeenCalledWith(
				expect.stringContaining('Failed to load setting "invalid"'),
				expect.any(Error)
			);
		});

		it('handles different data types (string, number, boolean, object, array)', () => {
			localStorage.setItem('image-search.string', JSON.stringify('text'));
			localStorage.setItem('image-search.number', JSON.stringify(123));
			localStorage.setItem('image-search.boolean', JSON.stringify(true));
			localStorage.setItem('image-search.object', JSON.stringify({ key: 'value' }));
			localStorage.setItem('image-search.array', JSON.stringify([1, 2, 3]));

			expect(localSettings.get('string', '')).toBe('text');
			expect(localSettings.get('number', 0)).toBe(123);
			expect(localSettings.get('boolean', false)).toBe(true);
			expect(localSettings.get('object', {})).toEqual({ key: 'value' });
			expect(localSettings.get('array', [])).toEqual([1, 2, 3]);
		});
	});

	describe('set()', () => {
		it('persists setting to localStorage with namespace prefix', () => {
			localSettings.set('test.key', 'test-value');

			const stored = localStorage.getItem('image-search.test.key');
			expect(stored).toBe(JSON.stringify('test-value'));
		});

		it('updates cache for immediate retrieval', () => {
			localSettings.set('test.key', 'immediate-value');

			const result = localSettings.get('test.key', 'default');
			expect(result).toBe('immediate-value');
		});

		it('serializes complex objects correctly', () => {
			const complexObject = {
				user: { id: 1, name: 'Alice' },
				settings: { theme: 'dark', notifications: true }
			};

			localSettings.set('complex', complexObject);

			const stored = localStorage.getItem('image-search.complex');
			expect(stored).toBe(JSON.stringify(complexObject));

			const retrieved = localSettings.get('complex', {});
			expect(retrieved).toEqual(complexObject);
		});

		it('overwrites existing values', () => {
			localSettings.set('test.key', 'first-value');
			expect(localSettings.get('test.key', '')).toBe('first-value');

			localSettings.set('test.key', 'second-value');
			expect(localSettings.get('test.key', '')).toBe('second-value');
		});

		it('handles localStorage errors gracefully', () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			// Mock setItem to throw error (simulate quota exceeded)
			const originalSetItem = localStorage.setItem;
			localStorage.setItem = vi.fn(() => {
				throw new Error('QuotaExceededError');
			});

			// Should not throw
			expect(() => {
				localSettings.set('test.key', 'value');
			}).not.toThrow();

			expect(consoleWarnSpy).toHaveBeenCalledWith(
				expect.stringContaining('Failed to save setting "test.key"'),
				expect.any(Error)
			);

			// Restore
			localStorage.setItem = originalSetItem;
		});
	});

	describe('remove()', () => {
		it('removes setting from both cache and localStorage', () => {
			// Set a value first
			localSettings.set('test.key', 'value');
			expect(localSettings.get('test.key', 'default')).toBe('value');
			expect(localStorage.getItem('image-search.test.key')).toBeTruthy();

			// Remove it
			localSettings.remove('test.key');

			// Should return default (not cached)
			expect(localSettings.get('test.key', 'default')).toBe('default');
			// Should not be in localStorage
			expect(localStorage.getItem('image-search.test.key')).toBeNull();
		});

		it('handles removing non-existent keys gracefully', () => {
			expect(() => {
				localSettings.remove('non.existent.key');
			}).not.toThrow();
		});

		it('handles localStorage errors gracefully', () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			// Mock removeItem to throw error
			const originalRemoveItem = localStorage.removeItem;
			localStorage.removeItem = vi.fn(() => {
				throw new Error('Storage error');
			});

			expect(() => {
				localSettings.remove('test.key');
			}).not.toThrow();

			expect(consoleWarnSpy).toHaveBeenCalledWith(
				expect.stringContaining('Failed to remove setting "test.key"'),
				expect.any(Error)
			);

			// Restore
			localStorage.removeItem = originalRemoveItem;
		});
	});

	describe('has()', () => {
		it('returns true when setting exists in localStorage', () => {
			localStorage.setItem('image-search.test.key', JSON.stringify('value'));

			expect(localSettings.has('test.key')).toBe(true);
		});

		it('returns false when setting does not exist in localStorage', () => {
			expect(localSettings.has('non.existent')).toBe(false);
		});

		it('returns false for cached defaults (not persisted)', () => {
			// Get with default value (caches but doesn't persist)
			localSettings.get('test.key', 'default');

			// Should return false because it's only cached, not in localStorage
			expect(localSettings.has('test.key')).toBe(false);
		});

		it('returns true after setting a value', () => {
			localSettings.set('test.key', 'value');

			expect(localSettings.has('test.key')).toBe(true);
		});

		it('returns false after removing a value', () => {
			localSettings.set('test.key', 'value');
			expect(localSettings.has('test.key')).toBe(true);

			localSettings.remove('test.key');
			expect(localSettings.has('test.key')).toBe(false);
		});

		it('handles localStorage errors gracefully', () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			// Mock getItem to throw error
			const originalGetItem = localStorage.getItem;
			localStorage.getItem = vi.fn(() => {
				throw new Error('Storage error');
			});

			const result = localSettings.has('test.key');

			expect(result).toBe(false);
			// Note: has() doesn't log warnings on errors, just returns false
			expect(consoleWarnSpy).not.toHaveBeenCalled();

			// Restore
			localStorage.getItem = originalGetItem;
		});
	});

	describe('clearAll()', () => {
		it('clears all namespaced settings from localStorage', () => {
			// Add multiple settings
			localSettings.set('key1', 'value1');
			localSettings.set('key2', 'value2');
			localSettings.set('nested.key', 'value3');

			// Verify they exist
			expect(localSettings.has('key1')).toBe(true);
			expect(localSettings.has('key2')).toBe(true);
			expect(localSettings.has('nested.key')).toBe(true);

			// Clear all
			localSettings.clearAll();

			// Verify they're gone
			expect(localSettings.has('key1')).toBe(false);
			expect(localSettings.has('key2')).toBe(false);
			expect(localSettings.has('nested.key')).toBe(false);
		});

		it('does not affect other apps keys (preserves non-namespaced keys)', () => {
			// Add our namespaced keys
			localSettings.set('our.key', 'value1');

			// Add keys from other apps
			localStorage.setItem('other-app.key', 'other-value');
			localStorage.setItem('random-key', 'random-value');

			// Clear our settings
			localSettings.clearAll();

			// Our keys should be gone
			expect(localStorage.getItem('image-search.our.key')).toBeNull();

			// Other apps' keys should remain
			expect(localStorage.getItem('other-app.key')).toBe('other-value');
			expect(localStorage.getItem('random-key')).toBe('random-value');
		});

		it('clears in-memory cache', () => {
			localSettings.set('test.key', 'value');

			// Value is cached
			expect(localSettings.get('test.key', 'default')).toBe('value');

			// Clear all
			localSettings.clearAll();

			// Should return default (cache cleared)
			expect(localSettings.get('test.key', 'default')).toBe('default');
		});

		it('handles localStorage errors gracefully', () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			// Add a setting
			localSettings.set('test.key', 'value');

			// Mock removeItem to throw error
			const originalRemoveItem = localStorage.removeItem;
			localStorage.removeItem = vi.fn(() => {
				throw new Error('Storage error');
			});

			expect(() => {
				localSettings.clearAll();
			}).not.toThrow();

			expect(consoleWarnSpy).toHaveBeenCalledWith(
				expect.stringContaining('Failed to clear settings'),
				expect.any(Error)
			);

			// Restore
			localStorage.removeItem = originalRemoveItem;
		});
	});

	describe('namespace isolation', () => {
		it('uses "image-search." prefix for all keys', () => {
			localSettings.set('test.key', 'value');

			// Should be stored with prefix
			expect(localStorage.getItem('image-search.test.key')).toBe(JSON.stringify('value'));
			// Should NOT be stored without prefix
			expect(localStorage.getItem('test.key')).toBeNull();
		});

		it('handles keys with dots correctly', () => {
			localSettings.set('user.preferences.theme', 'dark');

			expect(localStorage.getItem('image-search.user.preferences.theme')).toBe(
				JSON.stringify('dark')
			);
		});
	});

	describe('reactivity and state', () => {
		it('exposes state property with cache', () => {
			localSettings.set('key1', 'value1');
			localSettings.set('key2', 'value2');

			const state = localSettings.state;

			expect(state.cache.has('key1')).toBe(true);
			expect(state.cache.has('key2')).toBe(true);
			expect(state.cache.get('key1')).toBe('value1');
			expect(state.cache.get('key2')).toBe('value2');
		});
	});
});
