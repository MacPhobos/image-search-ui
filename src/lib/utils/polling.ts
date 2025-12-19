import { onDestroy } from 'svelte';

/**
 * Creates a polling interval for fetching data periodically.
 * Automatically cleans up when the component is destroyed.
 *
 * @param fetchFn Function to fetch data
 * @param intervalMs Interval in milliseconds (default: 2000)
 * @returns Object with start, stop, and reactive state
 */
export function createPollingInterval<T>(
	fetchFn: () => Promise<T>,
	intervalMs: number = 2000
): {
	start: () => void;
	stop: () => void;
	data: () => T | null;
	loading: () => boolean;
	error: () => Error | null;
	setData: (data: T | null) => void;
	setLoading: (loading: boolean) => void;
	setError: (error: Error | null) => void;
} {
	let intervalId: ReturnType<typeof setInterval> | null = null;
	let data = $state<T | null>(null);
	let loading = $state(false);
	let error = $state<Error | null>(null);

	async function fetchData() {
		loading = true;
		error = null;
		try {
			data = await fetchFn();
		} catch (err) {
			error = err instanceof Error ? err : new Error('Unknown error');
		} finally {
			loading = false;
		}
	}

	function start() {
		if (intervalId) return;

		// Fetch immediately
		fetchData();

		// Then poll at intervals
		intervalId = setInterval(fetchData, intervalMs);
	}

	function stop() {
		if (intervalId) {
			clearInterval(intervalId);
			intervalId = null;
		}
	}

	// Cleanup on component destroy
	onDestroy(() => {
		stop();
	});

	return {
		start,
		stop,
		data: () => data,
		loading: () => loading,
		error: () => error,
		setData: (newData: T | null) => {
			data = newData;
		},
		setLoading: (newLoading: boolean) => {
			loading = newLoading;
		},
		setError: (newError: Error | null) => {
			error = newError;
		}
	};
}
