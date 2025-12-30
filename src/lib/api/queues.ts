import { env } from '$env/dynamic/public';
import { ApiError } from './client';

const API_BASE_URL = env.VITE_API_BASE_URL || 'http://localhost:8000';

// Type definitions for queue monitoring
export type JobStatus =
	| 'queued'
	| 'started'
	| 'deferred'
	| 'finished'
	| 'stopped'
	| 'scheduled'
	| 'canceled'
	| 'failed';

export type WorkerState = 'idle' | 'busy' | 'suspended';

export interface QueueSummary {
	name: string;
	count: number;
	isEmpty: boolean;
	startedCount: number;
	failedCount: number;
	finishedCount: number;
	scheduledCount: number;
}

export interface QueuesOverviewResponse {
	queues: QueueSummary[];
	totalJobs: number;
	totalWorkers: number;
	workersBusy: number;
	redisConnected: boolean;
}

export interface JobInfo {
	id: string;
	funcName: string;
	status: JobStatus;
	queueName: string;
	args: string[];
	kwargs: Record<string, string>;
	createdAt: string | null;
	enqueuedAt: string | null;
	startedAt: string | null;
	endedAt: string | null;
	timeout: number | null;
	result: string | null;
	errorMessage: string | null;
	workerName: string | null;
}

export interface QueueDetailResponse {
	name: string;
	count: number;
	isEmpty: boolean;
	jobs: JobInfo[];
	startedJobs: JobInfo[];
	failedJobs: JobInfo[];
	page: number;
	pageSize: number;
	hasMore: boolean;
}

export interface JobDetailResponse extends JobInfo {
	excInfo: string | null;
	meta: Record<string, unknown> | null;
	retryCount: number;
	origin: string | null;
}

export interface CurrentJobInfo {
	jobId: string;
	funcName: string;
	startedAt: string | null;
}

export interface WorkerInfo {
	name: string;
	state: WorkerState;
	queues: string[];
	currentJob: CurrentJobInfo | null;
	successfulJobCount: number;
	failedJobCount: number;
	totalWorkingTime: number;
	birthDate: string | null;
	lastHeartbeat: string | null;
	pid: number | null;
	hostname: string | null;
}

export interface WorkersResponse {
	workers: WorkerInfo[];
	total: number;
	active: number;
	idle: number;
}

async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
	const url = `${API_BASE_URL}${endpoint}`;

	try {
		const response = await fetch(url, {
			...options,
			headers: {
				'Content-Type': 'application/json',
				...options?.headers
			}
		});

		if (!response.ok) {
			const errorData = await response.json().catch(() => null);
			throw new ApiError(
				errorData?.message || `HTTP ${response.status}: ${response.statusText}`,
				response.status,
				errorData
			);
		}

		return await response.json();
	} catch (error) {
		if (error instanceof ApiError) {
			throw error;
		}
		throw new ApiError('Network request failed', 0, undefined);
	}
}

/**
 * Get overview of all queues with worker statistics.
 */
export async function getQueuesOverview(): Promise<QueuesOverviewResponse> {
	return apiRequest<QueuesOverviewResponse>('/api/v1/queues');
}

/**
 * Get detailed information for a specific queue with paginated jobs.
 */
export async function getQueueDetail(
	queueName: string,
	page: number = 1,
	pageSize: number = 50
): Promise<QueueDetailResponse> {
	const params = new URLSearchParams({
		page: page.toString(),
		pageSize: pageSize.toString()
	});
	return apiRequest<QueueDetailResponse>(
		`/api/v1/queues/${encodeURIComponent(queueName)}?${params}`
	);
}

/**
 * Get detailed information for a specific job.
 */
export async function getJobDetail(jobId: string): Promise<JobDetailResponse> {
	return apiRequest<JobDetailResponse>(`/api/v1/jobs/${encodeURIComponent(jobId)}`);
}

/**
 * Get information about all RQ workers.
 */
export async function getWorkers(): Promise<WorkersResponse> {
	return apiRequest<WorkersResponse>('/api/v1/workers');
}
