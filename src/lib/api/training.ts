import type {
	TrainingSession,
	TrainingSessionCreate,
	TrainingSessionUpdate,
	TrainingJob,
	TrainingProgress,
	TrainingSubdirectory,
	SubdirectorySelection,
	DirectoryScanResponse,
	SubdirectoryInfo,
	ControlResponse,
	PaginatedTrainingSessionResponse,
	PaginatedTrainingJobResponse
} from '$lib/types';
import type { components } from './generated';
import { env } from '$env/dynamic/public';
import { ApiError } from './client';

const API_BASE_URL = env.VITE_API_BASE_URL || 'http://localhost:8000';

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

		// Handle 204 No Content
		if (response.status === 204) {
			return undefined as T;
		}

		return await response.json();
	} catch (error) {
		if (error instanceof ApiError) {
			throw error;
		}
		throw new ApiError('Network request failed', 0, undefined);
	}
}

// Directory Preview Types

export interface DirectoryImageInfo {
	filename: string;
	full_path: string;
	size_bytes: number;
	modified_at: string;
}

export interface DirectoryPreviewResponse {
	directory: string;
	image_count: number;
	images: DirectoryImageInfo[];
}

// Session CRUD

/**
 * Create a new training session.
 */
export async function createSession(data: TrainingSessionCreate): Promise<TrainingSession> {
	// Trim paths to prevent whitespace issues
	const cleanedData = {
		...data,
		rootPath: data.rootPath.trim(),
		subdirectories: data.subdirectories?.map((s) => s.trim())
	};
	return apiRequest<TrainingSession>('/api/v1/training/sessions', {
		method: 'POST',
		body: JSON.stringify(cleanedData)
	});
}

/**
 * List training sessions with optional filters.
 */
export async function listSessions(
	page: number = 1,
	pageSize: number = 50,
	status?: string
): Promise<PaginatedTrainingSessionResponse> {
	const params = new URLSearchParams({
		page: page.toString(),
		page_size: pageSize.toString()
	});
	if (status) {
		params.append('status', status);
	}
	return apiRequest<PaginatedTrainingSessionResponse>(
		`/api/v1/training/sessions?${params.toString()}`
	);
}

/**
 * Get a single training session by ID.
 */
export async function getSession(sessionId: number): Promise<TrainingSession> {
	return apiRequest<TrainingSession>(`/api/v1/training/sessions/${sessionId}`);
}

/**
 * Update a training session.
 */
export async function updateSession(
	sessionId: number,
	data: TrainingSessionUpdate
): Promise<TrainingSession> {
	return apiRequest<TrainingSession>(`/api/v1/training/sessions/${sessionId}`, {
		method: 'PATCH',
		body: JSON.stringify(data)
	});
}

/**
 * Delete a training session.
 */
export async function deleteSession(sessionId: number): Promise<undefined> {
	return apiRequest<undefined>(`/api/v1/training/sessions/${sessionId}`, {
		method: 'DELETE'
	});
}

// Directory scanning

/**
 * Scan a directory for images.
 */
export async function scanDirectory(
	rootPath: string,
	recursive: boolean = true
): Promise<DirectoryScanResponse> {
	return apiRequest<DirectoryScanResponse>('/api/v1/training/directories/scan', {
		method: 'POST',
		body: JSON.stringify({ root_path: rootPath.trim(), recursive })
	});
}

/**
 * List subdirectories at a given path.
 * @param path - Root directory path
 * @param includeTrainingStatus - Whether to include training status metadata (default: true)
 */
export async function listDirectories(
	path: string,
	includeTrainingStatus: boolean = true
): Promise<SubdirectoryInfo[]> {
	const params = new URLSearchParams({
		path: path.trim(),
		include_training_status: includeTrainingStatus.toString()
	});
	// API returns array directly, not wrapped in an object
	return apiRequest<SubdirectoryInfo[]>(`/api/v1/training/directories?${params.toString()}`);
}

/**
 * Preview images in a directory before ingestion.
 * Does NOT create database records.
 *
 * @param directoryPath - Directory path to preview
 * @returns List of images with preview thumbnail URLs
 */
export async function previewDirectoryImages(
	directoryPath: string
): Promise<DirectoryPreviewResponse> {
	const params = new URLSearchParams({
		path: directoryPath.trim()
	});

	return apiRequest<DirectoryPreviewResponse>(
		`/api/v1/training/directories/preview?${params.toString()}`
	);
}

/**
 * Get the thumbnail URL for a non-ingested image preview.
 * Uses the API base URL to construct the full URL.
 *
 * @param imagePath - Full path to the image file
 * @returns Full URL to the thumbnail endpoint
 */
export function getPreviewThumbnailUrl(imagePath: string): string {
	const params = new URLSearchParams({
		path: imagePath
	});
	return `${API_BASE_URL}/api/v1/training/directories/preview/thumbnail?${params.toString()}`;
}

// Session subdirectories

/**
 * Get subdirectories for a training session.
 */
export async function getSubdirectories(sessionId: number): Promise<TrainingSubdirectory[]> {
	const response = await apiRequest<{ subdirectories: TrainingSubdirectory[] }>(
		`/api/v1/training/sessions/${sessionId}/subdirectories`
	);
	return response.subdirectories;
}

/**
 * Update subdirectory selections for a training session.
 */
export async function updateSubdirectories(
	sessionId: number,
	selections: SubdirectorySelection[]
): Promise<TrainingSubdirectory[]> {
	const response = await apiRequest<{ subdirectories: TrainingSubdirectory[] }>(
		`/api/v1/training/sessions/${sessionId}/subdirectories`,
		{
			method: 'PATCH',
			body: JSON.stringify({ selections })
		}
	);
	return response.subdirectories;
}

// Progress

/**
 * Get training progress for a session.
 */
export async function getProgress(sessionId: number): Promise<TrainingProgress> {
	return apiRequest<TrainingProgress>(`/api/v1/training/sessions/${sessionId}/progress`);
}

// Control

/**
 * Start training for a session.
 */
export async function startTraining(sessionId: number): Promise<ControlResponse> {
	return apiRequest<ControlResponse>(`/api/v1/training/sessions/${sessionId}/start`, {
		method: 'POST'
	});
}

/**
 * Pause training for a session.
 */
export async function pauseTraining(sessionId: number): Promise<ControlResponse> {
	return apiRequest<ControlResponse>(`/api/v1/training/sessions/${sessionId}/pause`, {
		method: 'POST'
	});
}

/**
 * Cancel training for a session.
 */
export async function cancelTraining(sessionId: number): Promise<ControlResponse> {
	return apiRequest<ControlResponse>(`/api/v1/training/sessions/${sessionId}/cancel`, {
		method: 'POST'
	});
}

/**
 * Response from restart operations with cleanup statistics.
 */
export interface RestartResponse {
	session_id: number;
	status: string;
	message: string;
	cleanup_stats: {
		operation: string;
		items_deleted: number;
		items_reset: number;
		items_preserved: number;
		duration_ms: number;
		[key: string]: unknown;
	};
}

/**
 * Restart training (Phase 1: CLIP embeddings)
 * @param sessionId - Training session ID
 * @param failedOnly - true = retry only failed jobs, false = full restart
 */
export async function restartTraining(
	sessionId: number,
	failedOnly: boolean = true
): Promise<RestartResponse> {
	const params = new URLSearchParams();
	params.set('failed_only', String(failedOnly));

	const response = await fetch(
		`${API_BASE_URL}/api/v1/training/sessions/${sessionId}/restart-training?${params}`,
		{ method: 'POST' }
	);

	if (!response.ok) {
		const error = await response.json();
		throw new ApiError(error.detail || 'Restart failed', response.status, error);
	}

	return response.json();
}

/**
 * Restart face detection (Phase 2: InsightFace)
 * @param sessionId - Training session ID
 * @param deletePersons - true = delete orphaned Person records
 */
export async function restartFaceDetection(
	sessionId: number,
	deletePersons: boolean = false
): Promise<RestartResponse> {
	const params = new URLSearchParams();
	if (deletePersons) params.set('delete_persons', 'true');

	const response = await fetch(
		`${API_BASE_URL}/api/v1/training/sessions/${sessionId}/restart-faces?${params}`,
		{ method: 'POST' }
	);

	if (!response.ok) {
		const error = await response.json();
		throw new ApiError(error.detail || 'Restart failed', response.status, error);
	}

	return response.json();
}

/**
 * Restart clustering (Phase 3: HDBSCAN)
 * @param sessionId - Training session ID
 */
export async function restartClustering(sessionId: number): Promise<RestartResponse> {
	const response = await fetch(
		`${API_BASE_URL}/api/v1/training/sessions/${sessionId}/restart-clustering`,
		{ method: 'POST' }
	);

	if (!response.ok) {
		const error = await response.json();
		throw new ApiError(error.detail || 'Restart failed', response.status, error);
	}

	return response.json();
}

// Jobs

/**
 * List training jobs for a session.
 */
export async function listJobs(
	sessionId: number,
	page: number = 1,
	pageSize: number = 50,
	status?: string
): Promise<PaginatedTrainingJobResponse> {
	const params = new URLSearchParams({
		page: page.toString(),
		page_size: pageSize.toString()
	});
	if (status) {
		params.append('status', status);
	}
	return apiRequest<PaginatedTrainingJobResponse>(
		`/api/v1/training/sessions/${sessionId}/jobs?${params.toString()}`
	);
}

/**
 * Get a single training job by ID.
 */
export async function getJob(jobId: number): Promise<TrainingJob> {
	return apiRequest<TrainingJob>(`/api/v1/training/jobs/${jobId}`);
}

/**
 * Get unified progress across all training phases.
 */
export async function getUnifiedProgress(
	sessionId: number
): Promise<components['schemas']['UnifiedProgressResponse']> {
	return apiRequest<components['schemas']['UnifiedProgressResponse']>(
		`/api/v1/training/sessions/${sessionId}/progress-unified`
	);
}

// Images

/**
 * Get URL for image thumbnail.
 */
export function getThumbnailUrl(assetId: number): string {
	return `${API_BASE_URL}/api/v1/images/${assetId}/thumbnail`;
}

/**
 * Get URL for full image.
 */
export function getFullImageUrl(assetId: number): string {
	return `${API_BASE_URL}/api/v1/images/${assetId}/full`;
}
