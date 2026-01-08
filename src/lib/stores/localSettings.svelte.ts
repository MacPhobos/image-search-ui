import { browser } from '$app/environment';

/** Namespace prefix for all localStorage keys to avoid conflicts */
const STORAGE_NAMESPACE = 'image-search';

interface LocalSettingsState {
	/** In-memory cache of all accessed settings */
	cache: Map<string, unknown>;
}

function createLocalSettings() {
	const state = $state<LocalSettingsState>({
		cache: new Map()
	});

	/**
	 * Get the full localStorage key with namespace
	 */
	function getStorageKey(key: string): string {
		return `${STORAGE_NAMESPACE}.${key}`;
	}

	/**
	 * Get a setting value. Returns the stored value if it exists,
	 * otherwise returns the provided default.
	 *
	 * @param key - The setting key (e.g., 'training.lastRootPath')
	 * @param defaultValue - Value to return if setting doesn't exist
	 * @returns The stored value or default
	 *
	 * @example
	 * const sortOrder = localSettings.get('search.sortOrder', 'relevance');
	 * const pageSize = localSettings.get('search.pageSize', 24);
	 */
	function get<T>(key: string, defaultValue: T): T {
		// Check in-memory cache first
		if (state.cache.has(key)) {
			return state.cache.get(key) as T;
		}

		// Try to load from localStorage
		if (browser) {
			try {
				const stored = localStorage.getItem(getStorageKey(key));
				if (stored !== null) {
					const parsed = JSON.parse(stored) as T;
					state.cache.set(key, parsed);
					return parsed;
				}
			} catch (err) {
				// JSON parse error or localStorage access error
				console.warn(`Failed to load setting "${key}" from localStorage:`, err);
			}
		}

		// Cache and return default
		state.cache.set(key, defaultValue);
		return defaultValue;
	}

	/**
	 * Set a setting value with automatic persistence.
	 *
	 * @param key - The setting key
	 * @param value - The value to store
	 *
	 * @example
	 * localSettings.set('search.sortOrder', 'date_desc');
	 * localSettings.set('people.viewMode', 'grid');
	 */
	function set<T>(key: string, value: T): void {
		// Update in-memory cache
		state.cache.set(key, value);
		// Trigger reactivity by creating new Map
		state.cache = new Map(state.cache);

		// Persist to localStorage
		if (browser) {
			try {
				localStorage.setItem(getStorageKey(key), JSON.stringify(value));
			} catch (err) {
				console.warn(`Failed to save setting "${key}" to localStorage:`, err);
			}
		}
	}

	/**
	 * Remove a setting from storage.
	 *
	 * @param key - The setting key to remove
	 */
	function remove(key: string): void {
		state.cache.delete(key);
		state.cache = new Map(state.cache);

		if (browser) {
			try {
				localStorage.removeItem(getStorageKey(key));
			} catch (err) {
				console.warn(`Failed to remove setting "${key}" from localStorage:`, err);
			}
		}
	}

	/**
	 * Check if a setting exists in storage (not just cached default).
	 *
	 * @param key - The setting key to check
	 */
	function has(key: string): boolean {
		if (browser) {
			try {
				return localStorage.getItem(getStorageKey(key)) !== null;
			} catch {
				return false;
			}
		}
		return false;
	}

	/**
	 * Clear all settings under the namespace.
	 * Use with caution - this removes ALL persisted UI settings.
	 */
	function clearAll(): void {
		if (browser) {
			try {
				const prefix = `${STORAGE_NAMESPACE}.`;
				const keysToRemove: string[] = [];

				for (let i = 0; i < localStorage.length; i++) {
					const key = localStorage.key(i);
					if (key?.startsWith(prefix)) {
						keysToRemove.push(key);
					}
				}

				keysToRemove.forEach((key) => localStorage.removeItem(key));
			} catch (err) {
				console.warn('Failed to clear settings from localStorage:', err);
			}
		}
		state.cache = new Map();
	}

	return {
		get state() {
			return state;
		},
		get,
		set,
		remove,
		has,
		clearAll
	};
}

export const localSettings = createLocalSettings();
