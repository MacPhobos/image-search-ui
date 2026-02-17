/**
 * Google Drive API client functions for upload management and folder browsing.
 *
 * @example
 * ```typescript
 * // Start an upload batch
 * const result = await startUpload(personId, [1, 2, 3], folderId);
 *
 * // Poll upload status
 * const cleanup = pollUploadStatus(result.batchId, onUpdate, onComplete);
 *
 * // List Drive folders
 * const folders = await listDriveFolders(parentId);
 *
 * // Check Drive health
 * const health = await getDriveHealth();
 * ```
 */

import { apiRequest } from './client';

// ── Stub Types ──────────────────────────────────────
// These types mirror the Phase 4 Pydantic schemas with camelCase aliases.
// When the backend is deployed, replace these with:
//   import type { components } from './generated';
//   type StartUploadResponse = components['schemas']['StartUploadResponse'];
// etc.

export interface StartUploadRequest {
	personId: string;
	photoIds: number[];
	folderId: string;
	options?: UploadOptions | null;
}

export interface UploadOptions {
	personNameOverride?: string | null;
	createPersonSubfolder?: boolean;
}

export interface StartUploadResponse {
	batchId: string;
	jobIds: string[];
	totalPhotos: number;
	estimatedTimeSeconds?: number | null;
	message: string;
}

export interface UploadFileStatus {
	assetId: number;
	filename: string;
	status: string;
	remoteFileId?: string | null;
	errorMessage?: string | null;
	completedAt?: string | null;
}

export interface UploadStatusResponse {
	batchId: string;
	status: string;
	total: number;
	completed: number;
	failed: number;
	inProgress: number;
	percentage: number;
	etaSeconds?: number | null;
	files: UploadFileStatus[];
	startedAt?: string | null;
	completedAt?: string | null;
}

export interface CancelUploadResponse {
	batchId: string;
	status: string;
	completedBeforeCancel: number;
	cancelledCount: number;
	message: string;
}

export interface DriveFolderInfo {
	id: string;
	name: string;
	parentId?: string | null;
	hasChildren: boolean;
	createdAt?: string | null;
}

export interface FolderListResponse {
	parentId?: string | null;
	folders: DriveFolderInfo[];
	total: number;
}

export interface CreateFolderRequest {
	name: string;
	parentId?: string | null;
}

export interface CreateFolderResponse {
	folderId: string;
	name: string;
	parentId?: string | null;
	path: string;
}

export interface DriveHealthResponse {
	connected: boolean;
	enabled: boolean;
	serviceAccountEmail?: string | null;
	rootFolderId?: string | null;
	rootFolderName?: string | null;
	storageUsedBytes?: number | null;
	storageTotalBytes?: number | null;
	storageUsagePercentage?: number | null;
	lastUploadAt?: string | null;
	error?: string | null;
}

// ── Frontend-Only Types ─────────────────────────────

export type WizardStep = 'review' | 'folder' | 'uploading' | 'complete';

export type FileUploadStatus = 'pending' | 'uploading' | 'uploaded' | 'failed' | 'skipped';

export interface UploadFileDisplay {
	photoId: number;
	fileName: string;
	fileSize: number;
	status: FileUploadStatus;
	error?: string;
	driveFileId?: string;
}

// ── Upload Operations ───────────────────────────────

/**
 * Start a batch upload job. Returns a batch ID for polling.
 * Enqueues an RQ background job on the backend.
 */
export async function startUpload(
	personId: string,
	photoIds: number[],
	folderId: string
): Promise<StartUploadResponse> {
	return apiRequest<StartUploadResponse>('/api/v1/gdrive/upload', {
		method: 'POST',
		body: JSON.stringify({
			person_id: personId,
			photo_ids: photoIds,
			folder_id: folderId
		})
	});
}

/**
 * Poll the status of an upload batch.
 * Returns per-file statuses for progress display.
 */
export async function getUploadStatus(batchId: string): Promise<UploadStatusResponse> {
	return apiRequest<UploadStatusResponse>(`/api/v1/gdrive/upload/${batchId}/status`);
}

/**
 * Cancel a running upload batch.
 * Already-uploaded files remain in Drive.
 */
export async function cancelUpload(batchId: string): Promise<CancelUploadResponse> {
	return apiRequest<CancelUploadResponse>(`/api/v1/gdrive/upload/${batchId}`, {
		method: 'DELETE'
	});
}

// ── Folder Operations ───────────────────────────────

/**
 * List folders inside a parent folder.
 * If parentId is omitted, lists root-level folders.
 */
export async function listDriveFolders(parentId?: string): Promise<FolderListResponse> {
	const params = parentId ? `?parent_id=${encodeURIComponent(parentId)}` : '';
	return apiRequest<FolderListResponse>(`/api/v1/gdrive/folders${params}`);
}

/**
 * Create a new folder inside a parent folder.
 * Returns the created folder with its Drive ID.
 */
export async function createDriveFolder(
	parentId: string | null,
	name: string
): Promise<CreateFolderResponse> {
	return apiRequest<CreateFolderResponse>('/api/v1/gdrive/folders', {
		method: 'POST',
		body: JSON.stringify({
			name,
			parent_id: parentId
		})
	});
}

// ── Health / Status ─────────────────────────────────

/**
 * Check if Google Drive is configured and connected.
 * Used to conditionally show/hide upload buttons.
 */
export async function getDriveHealth(): Promise<DriveHealthResponse> {
	return apiRequest<DriveHealthResponse>('/api/v1/gdrive/health');
}

// ── Polling Helper ──────────────────────────────────

/**
 * Start polling upload status at a fixed interval.
 * Returns a cleanup function to stop polling.
 *
 * Usage in $effect:
 *   $effect(() => {
 *     if (batchId) return pollUploadStatus(batchId, onUpdate, onComplete);
 *   });
 */
export function pollUploadStatus(
	batchId: string,
	onUpdate: (status: UploadStatusResponse) => void,
	onComplete: (status: UploadStatusResponse) => void,
	intervalMs: number = 2000
): () => void {
	let stopped = false;

	async function poll() {
		if (stopped) return;
		try {
			const status = await getUploadStatus(batchId);
			if (stopped) return;
			onUpdate(status);

			const done =
				status.status === 'completed' ||
				status.status === 'failed' ||
				status.status === 'cancelled' ||
				status.status === 'partial_failure';
			if (done) {
				onComplete(status);
				return;
			}
		} catch {
			// Swallow polling errors - UI shows last known state
		}

		if (!stopped) {
			setTimeout(poll, intervalMs);
		}
	}

	poll();

	return () => {
		stopped = true;
	};
}
