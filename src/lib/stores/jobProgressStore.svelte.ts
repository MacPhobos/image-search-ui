/**
 * Svelte 5 runes-based store for tracking background job progress.
 * Supports multiple concurrent jobs with SSE connections and polling fallback.
 */

import { env } from '$env/dynamic/public';

const API_BASE_URL = env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface JobProgress {
	jobId: string;
	personId: string;
	personName: string;
	phase: string;
	current: number;
	total: number;
	message: string;
	status: 'queued' | 'running' | 'completed' | 'failed';
	error?: string;
	result?: {
		suggestionsCreated?: number;
		prototypesUsed?: number;
		candidatesFound?: number;
		duplicatesSkipped?: number;
	};
}

class JobProgressStore {
	// Reactive state using Svelte 5 runes
	jobs = $state<Map<string, JobProgress>>(new Map());
	private eventSources = new Map<string, EventSource>();
	private pollingIntervals = new Map<string, ReturnType<typeof setInterval>>();

	// Browsers limit SSE connections to ~6 per domain
	private readonly MAX_SSE_CONNECTIONS = 4;

	/**
	 * Start tracking a job via SSE (preferred) or polling (fallback).
	 * Falls back to polling when SSE connection limit reached.
	 * @param jobId Unique job identifier
	 * @param progressKey The progress_key returned from job creation endpoint
	 * @param personId Person UUID
	 * @param personName Person display name
	 * @param onComplete Callback when job completes successfully
	 * @param onError Callback when job fails
	 * @returns Cleanup function to stop tracking
	 */
	trackJob(
		jobId: string,
		progressKey: string,
		personId: string,
		personName: string,
		onComplete?: (job: JobProgress) => void,
		onError?: (error: string) => void
	): () => void {
		// Initialize job state
		const initialState: JobProgress = {
			jobId,
			personId,
			personName,
			phase: 'queued',
			current: 0,
			total: 100,
			message: 'Queued...',
			status: 'queued'
		};
		this.jobs.set(jobId, initialState);

		// Fall back to polling if SSE connection limit reached
		if (this.eventSources.size >= this.MAX_SSE_CONNECTIONS) {
			return this.trackJobViaPolling(jobId, progressKey, onComplete, onError);
		}

		// Open SSE connection (preferred) - uses progressKey query parameter
		const eventSource = new EventSource(
			`${API_BASE_URL}/api/v1/job-progress/events?progress_key=${encodeURIComponent(progressKey)}`
		);
		this.eventSources.set(jobId, eventSource);

		eventSource.addEventListener('progress', (event) => {
			const data = JSON.parse(event.data);
			const current = this.jobs.get(jobId);
			if (current) {
				this.jobs.set(jobId, {
					...current,
					phase: data.phase,
					current: data.current,
					total: data.total,
					message: data.message,
					status: 'running'
				});
			}
		});

		eventSource.addEventListener('complete', (event) => {
			const data = JSON.parse(event.data);
			const current = this.jobs.get(jobId);
			if (current) {
				const completed: JobProgress = {
					...current,
					phase: 'completed',
					current: data.current || data.total,
					total: data.total,
					message: data.message || 'Completed',
					status: 'completed',
					result: {
						suggestionsCreated: data.suggestionsCreated,
						prototypesUsed: data.prototypesUsed,
						candidatesFound: data.candidatesFound,
						duplicatesSkipped: data.duplicatesSkipped
					}
				};
				this.jobs.set(jobId, completed);
				onComplete?.(completed);
			}
			this.cleanup(jobId);
		});

		eventSource.addEventListener('error', (event) => {
			let errorMessage = 'Unknown error';
			if (event instanceof MessageEvent) {
				try {
					const data = JSON.parse(event.data);
					errorMessage = data.error || data.message || 'Job failed';
				} catch {
					errorMessage = 'Connection error';
				}
			}

			const current = this.jobs.get(jobId);
			if (current) {
				this.jobs.set(jobId, {
					...current,
					status: 'failed',
					error: errorMessage
				});
			}
			onError?.(errorMessage);
			this.cleanup(jobId);
		});

		// Return cleanup function
		return () => this.cleanup(jobId);
	}

	/**
	 * Get current state of a job.
	 */
	getJob(jobId: string): JobProgress | undefined {
		return this.jobs.get(jobId);
	}

	/**
	 * Check if any jobs are currently running.
	 */
	get hasRunningJobs(): boolean {
		return [...this.jobs.values()].some((j) => j.status === 'queued' || j.status === 'running');
	}

	/**
	 * Get all running jobs.
	 */
	get runningJobs(): JobProgress[] {
		return [...this.jobs.values()].filter(
			(j) => j.status === 'queued' || j.status === 'running'
		);
	}

	/**
	 * Polling fallback when SSE connections exhausted.
	 */
	private trackJobViaPolling(
		jobId: string,
		progressKey: string,
		onComplete?: (job: JobProgress) => void,
		onError?: (error: string) => void
	): () => void {
		const pollInterval = 2000; // 2 seconds

		const interval = setInterval(async () => {
			try {
				const response = await fetch(
					`${API_BASE_URL}/api/v1/job-progress/status?progress_key=${encodeURIComponent(progressKey)}`
				);
				if (!response.ok) {
					throw new Error('Job not found');
				}

				const data = await response.json();
				const current = this.jobs.get(jobId);
				if (!current) return;

				if (data.phase === 'completed') {
					const completed: JobProgress = {
						...current,
						phase: 'completed',
						current: data.current || data.total,
						total: data.total,
						message: data.message || 'Completed',
						status: 'completed',
						result: {
							suggestionsCreated: data.suggestionsCreated,
							prototypesUsed: data.prototypesUsed,
							candidatesFound: data.candidatesFound,
							duplicatesSkipped: data.duplicatesSkipped
						}
					};
					this.jobs.set(jobId, completed);
					onComplete?.(completed);
					this.cleanup(jobId);
				} else if (data.phase === 'failed') {
					this.jobs.set(jobId, { ...current, status: 'failed', error: data.error });
					onError?.(data.error || 'Job failed');
					this.cleanup(jobId);
				} else {
					this.jobs.set(jobId, {
						...current,
						phase: data.phase,
						current: data.current,
						total: data.total,
						message: data.message,
						status: 'running'
					});
				}
			} catch (err) {
				const message = err instanceof Error ? err.message : 'Polling error';
				onError?.(message);
				this.cleanup(jobId);
			}
		}, pollInterval);

		this.pollingIntervals.set(jobId, interval);
		return () => this.cleanup(jobId);
	}

	private cleanup(jobId: string) {
		const eventSource = this.eventSources.get(jobId);
		if (eventSource) {
			eventSource.close();
			this.eventSources.delete(jobId);
		}
		const interval = this.pollingIntervals.get(jobId);
		if (interval) {
			clearInterval(interval);
			this.pollingIntervals.delete(jobId);
		}
	}

	/**
	 * Clean up all connections (call on unmount).
	 */
	destroy() {
		for (const [jobId] of this.eventSources) {
			this.cleanup(jobId);
		}
		for (const [jobId] of this.pollingIntervals) {
			this.cleanup(jobId);
		}
		this.jobs.clear();
	}
}

// Export singleton instance
export const jobProgressStore = new JobProgressStore();
