import type { SearchMode } from '$lib/components/SearchModeToggle.svelte';

/**
 * Search history item
 */
export interface SearchHistoryItem {
	id: string;
	type: SearchMode;
	timestamp: number;
	query?: string;
	imageName?: string;
	textWeight?: number;
	modifierText?: string;
	alpha?: number;
}

const STORAGE_KEY = 'image-search.searchHistory';
const MAX_HISTORY_SIZE = 10;

/**
 * Load search history from localStorage
 */
function loadHistory(): SearchHistoryItem[] {
	if (typeof window === 'undefined') {
		return [];
	}

	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (!stored) {
			return [];
		}
		const parsed = JSON.parse(stored);
		return Array.isArray(parsed) ? parsed : [];
	} catch (error) {
		console.warn('Failed to load search history:', error);
		return [];
	}
}

/**
 * Save search history to localStorage
 */
function saveHistory(history: SearchHistoryItem[]): void {
	if (typeof window === 'undefined') {
		return;
	}

	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
	} catch (error) {
		console.warn('Failed to save search history:', error);
	}
}

/**
 * Generate unique ID for history item
 */
function generateId(): string {
	return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Search history store using Svelte 5 runes
 */
class SearchHistory {
	private items = $state<SearchHistoryItem[]>(loadHistory());

	/**
	 * Get all history items
	 */
	get all(): SearchHistoryItem[] {
		return this.items;
	}

	/**
	 * Get recent history items (sorted by timestamp, newest first)
	 */
	get recent(): SearchHistoryItem[] {
		return [...this.items].sort((a, b) => b.timestamp - a.timestamp);
	}

	/**
	 * Add a search to history
	 */
	addTextSearch(query: string): void {
		this.addItem({
			id: generateId(),
			type: 'text',
			timestamp: Date.now(),
			query
		});
	}

	/**
	 * Add an image search to history
	 */
	addImageSearch(imageName: string): void {
		this.addItem({
			id: generateId(),
			type: 'image',
			timestamp: Date.now(),
			imageName
		});
	}

	/**
	 * Add a hybrid search to history
	 */
	addHybridSearch(query: string | null, imageName: string | null, textWeight: number): void {
		this.addItem({
			id: generateId(),
			type: 'hybrid',
			timestamp: Date.now(),
			query: query || undefined,
			imageName: imageName || undefined,
			textWeight
		});
	}

	/**
	 * Add a composed search to history
	 */
	addComposedSearch(imageName: string, modifierText: string, alpha: number): void {
		this.addItem({
			id: generateId(),
			type: 'composed',
			timestamp: Date.now(),
			imageName,
			modifierText,
			alpha
		});
	}

	/**
	 * Add generic item to history
	 */
	private addItem(item: SearchHistoryItem): void {
		// Add to beginning, keep only last MAX_HISTORY_SIZE items
		this.items = [item, ...this.items].slice(0, MAX_HISTORY_SIZE);
		saveHistory(this.items);
	}

	/**
	 * Remove item from history
	 */
	removeItem(id: string): void {
		this.items = this.items.filter((item) => item.id !== id);
		saveHistory(this.items);
	}

	/**
	 * Clear all history
	 */
	clear(): void {
		this.items = [];
		saveHistory([]);
	}

	/**
	 * Get formatted display text for a history item
	 */
	getDisplayText(item: SearchHistoryItem): string {
		switch (item.type) {
			case 'text':
				return item.query || 'Text search';
			case 'image':
				return item.imageName || 'Image search';
			case 'hybrid':
				if (item.query && item.imageName) {
					return `"${item.query}" + ${item.imageName}`;
				} else if (item.query) {
					return item.query;
				} else if (item.imageName) {
					return item.imageName;
				}
				return 'Hybrid search';
			case 'composed':
				return `${item.imageName || 'Image'} ${item.modifierText || ''}`;
			default:
				return 'Search';
		}
	}

	/**
	 * Get relative time string (e.g., "2 minutes ago")
	 */
	getRelativeTime(timestamp: number): string {
		const now = Date.now();
		const diff = now - timestamp;
		const seconds = Math.floor(diff / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (days > 0) {
			return days === 1 ? '1 day ago' : `${days} days ago`;
		} else if (hours > 0) {
			return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
		} else if (minutes > 0) {
			return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
		} else {
			return 'Just now';
		}
	}
}

/**
 * Global search history store instance
 */
export const searchHistory = new SearchHistory();
