import { getBatchThumbnails } from '$lib/api/faces';

interface ThumbnailCacheState {
	cache: Map<number, string | null>;
	pending: Set<number>;
	error: string | null;
}

function createThumbnailCache() {
	const state = $state<ThumbnailCacheState>({
		cache: new Map(),
		pending: new Set(),
		error: null
	});

	function get(assetId: number): string | null | undefined {
		return state.cache.get(assetId);
	}

	function has(assetId: number): boolean {
		return state.cache.has(assetId);
	}

	function isPending(assetId: number): boolean {
		return state.pending.has(assetId);
	}

	async function fetchBatch(assetIds: number[]): Promise<void> {
		// Filter out already cached and pending
		const toFetch = assetIds.filter(
			(id) => !state.cache.has(id) && !state.pending.has(id)
		);

		if (toFetch.length === 0) return;

		// Mark as pending
		toFetch.forEach((id) => state.pending.add(id));
		state.pending = new Set(state.pending);

		try {
			// Batch in chunks of 100 (API limit)
			const BATCH_SIZE = 100;
			for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
				const batch = toFetch.slice(i, i + BATCH_SIZE);
				const response = await getBatchThumbnails(batch);

				// Update cache with results
				for (const [idStr, dataUri] of Object.entries(response.thumbnails)) {
					const id = parseInt(idStr, 10);
					state.cache.set(id, dataUri);
					state.pending.delete(id);
				}
			}

			state.cache = new Map(state.cache);
			state.pending = new Set(state.pending);
			state.error = null;
		} catch (e) {
			state.error = e instanceof Error ? e.message : 'Failed to load thumbnails';
			// Remove from pending on error
			toFetch.forEach((id) => state.pending.delete(id));
			state.pending = new Set(state.pending);
		}
	}

	function clear(): void {
		state.cache = new Map();
		state.pending = new Set();
		state.error = null;
	}

	return {
		get state() {
			return state;
		},
		get,
		has,
		isPending,
		fetchBatch,
		clear
	};
}

export const thumbnailCache = createThumbnailCache();
