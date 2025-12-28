/**
 * Face detection and person management API client.
 * Handles clusters, persons, and face labeling operations.
 */

import { env } from '$env/dynamic/public';
import { ApiError } from './client';

const API_BASE_URL = env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Prefixes a relative URL with the API base URL.
 * Returns absolute URLs unchanged.
 */
function toAbsoluteUrl(relativeUrl: string): string {
	if (relativeUrl.startsWith('http://') || relativeUrl.startsWith('https://')) {
		return relativeUrl;
	}
	return `${API_BASE_URL}${relativeUrl}`;
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
				errorData?.message ||
					errorData?.detail ||
					`HTTP ${response.status}: ${response.statusText}`,
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

// ============ Types ============

/** Bounding box coordinates for a face. */
export interface BoundingBox {
	x: number;
	y: number;
	width: number;
	height: number;
}

/** A single face instance detected in an image. */
export interface FaceInstance {
	id: string; // UUID
	assetId: number;
	bbox: BoundingBox;
	detectionConfidence: number;
	qualityScore: number | null;
	clusterId: string | null;
	personId: string | null; // UUID
	personName: string | null;
	createdAt: string; // ISO datetime
}

/** Summary info for a face cluster. */
export interface ClusterSummary {
	clusterId: string;
	faceCount: number;
	sampleFaceIds: string[]; // UUIDs
	avgQuality: number | null;
	personId: string | null; // UUID
	personName: string | null;
}

/** Paginated list of clusters. */
export interface ClusterListResponse {
	items: ClusterSummary[];
	total: number;
	page: number;
	pageSize: number;
}

/** Detailed cluster info with all faces. */
export interface ClusterDetailResponse {
	clusterId: string;
	faces: FaceInstance[];
	personId: string | null;
	personName: string | null;
}

/** Person entity representing a labeled individual. */
export interface Person {
	id: string; // UUID
	name: string;
	status: 'active' | 'merged' | 'hidden';
	faceCount: number;
	prototypeCount: number;
	createdAt: string;
	updatedAt: string;
}

/** Paginated list of persons. */
export interface PersonListResponse {
	items: Person[];
	total: number;
	page: number;
	pageSize: number;
}

/** Response from labeling a cluster. */
export interface LabelClusterResponse {
	personId: string;
	personName: string;
	facesLabeled: number;
	prototypesCreated: number;
}

/** Response from merging persons. */
export interface MergePersonsResponse {
	sourcePersonId: string;
	targetPersonId: string;
	facesMoved: number;
}

/** Response from splitting a cluster. */
export interface SplitClusterResponse {
	originalClusterId: string;
	newClusters: string[];
	status: string;
}

/** Response from detecting faces. */
export interface DetectFacesResponse {
	assetId: number;
	facesDetected: number;
	faceIds: string[];
}

/** Response from clustering operation. */
export interface ClusteringResultResponse {
	totalFaces: number;
	clustersFound: number;
	noiseCount: number;
	status: string;
}

/** A single face instance within a photo (for review UI). */
export interface FaceInPhoto {
	faceInstanceId: string;
	bboxX: number;
	bboxY: number;
	bboxW: number;
	bboxH: number;
	detectionConfidence: number;
	qualityScore: number | null;
	personId: string | null;
	personName: string | null;
	clusterId: string | null;
}

/** Photo with faces for person review. */
export interface PersonPhotoGroup {
	photoId: number;
	takenAt: string | null;
	thumbnailUrl: string;
	fullUrl: string;
	faces: FaceInPhoto[];
	faceCount: number;
	hasNonPersonFaces: boolean;
}

/** Paginated list of photos for a person. */
export interface PersonPhotosResponse {
	items: PersonPhotoGroup[];
	total: number;
	page: number;
	pageSize: number;
	personId: string;
	personName: string;
}

/** Response from bulk remove operation. */
export interface BulkRemoveResponse {
	updatedFaces: number;
	updatedPhotos: number;
	skippedFaces: number;
}

/** Response from bulk move operation. */
export interface BulkMoveResponse {
	toPersonId: string;
	toPersonName: string;
	updatedFaces: number;
	updatedPhotos: number;
	skippedFaces: number;
	personCreated: boolean;
}

/** Request to assign a face to a person. */
export interface AssignFaceRequest {
	personId: string;
}

/** Response from assigning a face. */
export interface AssignFaceResponse {
	faceId: string;
	personId: string;
	personName: string;
}

/** Response from unassigning a face. */
export interface UnassignFaceResponse {
	faceId: string;
	previousPersonId: string;
	previousPersonName: string;
}

/** Request to create a new person. */
export interface CreatePersonRequest {
	name: string;
}

/** Response from creating a person. */
export interface CreatePersonResponse {
	id: string;
	name: string;
	status: string;
	createdAt: string;
}

// ============ Utility Functions ============

/**
 * Transform FaceInstance array to FaceInPhoto array.
 * Maps bbox fields from object format to flat format for use in PhotoPreviewModal.
 */
export function transformFaceInstancesToFaceInPhoto(faces: FaceInstance[]): FaceInPhoto[] {
	return faces.map((face) => ({
		faceInstanceId: face.id,
		bboxX: face.bbox.x,
		bboxY: face.bbox.y,
		bboxW: face.bbox.width,
		bboxH: face.bbox.height,
		detectionConfidence: face.detectionConfidence,
		qualityScore: face.qualityScore,
		personId: face.personId,
		personName: face.personName,
		clusterId: face.clusterId
	}));
}

// ============ Cluster API Functions ============

/**
 * List face clusters with pagination.
 * @param page - Page number (1-indexed)
 * @param pageSize - Items per page (1-100)
 * @param includeLabeled - Include clusters already assigned to persons
 */
export async function listClusters(
	page: number = 1,
	pageSize: number = 20,
	includeLabeled: boolean = false
): Promise<ClusterListResponse> {
	const params = new URLSearchParams({
		page: page.toString(),
		page_size: pageSize.toString(),
		include_labeled: includeLabeled.toString()
	});
	return apiRequest<ClusterListResponse>(`/api/v1/faces/clusters?${params.toString()}`);
}

/**
 * Get detailed info for a specific cluster.
 * @param clusterId - The cluster ID
 */
export async function getCluster(clusterId: string): Promise<ClusterDetailResponse> {
	return apiRequest<ClusterDetailResponse>(
		`/api/v1/faces/clusters/${encodeURIComponent(clusterId)}`
	);
}

/**
 * Label a cluster with a person name (creates person if needed).
 * @param clusterId - The cluster ID to label
 * @param name - The person's name
 */
export async function labelCluster(clusterId: string, name: string): Promise<LabelClusterResponse> {
	return apiRequest<LabelClusterResponse>(
		`/api/v1/faces/clusters/${encodeURIComponent(clusterId)}/label`,
		{
			method: 'POST',
			body: JSON.stringify({ name })
		}
	);
}

/**
 * Split a cluster into smaller sub-clusters.
 * @param clusterId - The cluster ID to split
 * @param minClusterSize - Minimum faces per resulting cluster
 */
export async function splitCluster(
	clusterId: string,
	minClusterSize: number = 3
): Promise<SplitClusterResponse> {
	return apiRequest<SplitClusterResponse>(
		`/api/v1/faces/clusters/${encodeURIComponent(clusterId)}/split`,
		{
			method: 'POST',
			body: JSON.stringify({ minClusterSize })
		}
	);
}

// ============ Person API Functions ============

/**
 * List persons with pagination.
 * @param page - Page number (1-indexed)
 * @param pageSize - Items per page (1-100)
 * @param status - Filter by status (active, merged, hidden)
 */
export async function listPersons(
	page: number = 1,
	pageSize: number = 20,
	status?: 'active' | 'merged' | 'hidden'
): Promise<PersonListResponse> {
	const params = new URLSearchParams({
		page: page.toString(),
		page_size: pageSize.toString()
	});
	if (status) {
		params.set('status', status);
	}
	return apiRequest<PersonListResponse>(`/api/v1/faces/persons?${params.toString()}`);
}

/**
 * Create a new person.
 * @param name - The person's name
 */
export async function createPerson(name: string): Promise<CreatePersonResponse> {
	return apiRequest<CreatePersonResponse>('/api/v1/faces/persons', {
		method: 'POST',
		body: JSON.stringify({ name })
	});
}

/**
 * Merge one person into another.
 * @param personId - Source person ID to merge (will be marked as merged)
 * @param intoPersonId - Target person ID to merge into
 */
export async function mergePersons(
	personId: string,
	intoPersonId: string
): Promise<MergePersonsResponse> {
	return apiRequest<MergePersonsResponse>(`/api/v1/faces/persons/${personId}/merge`, {
		method: 'POST',
		body: JSON.stringify({ intoPersonId })
	});
}

/**
 * Get photos for person review with pagination.
 * @param personId - The person ID
 * @param page - Page number (1-indexed)
 * @param pageSize - Items per page (1-100)
 */
export async function getPersonPhotos(
	personId: string,
	page: number = 1,
	pageSize: number = 20
): Promise<PersonPhotosResponse> {
	const params = new URLSearchParams({
		page: page.toString(),
		page_size: pageSize.toString()
	});
	const response = await apiRequest<PersonPhotosResponse>(
		`/api/v1/faces/persons/${encodeURIComponent(personId)}/photos?${params.toString()}`
	);

	// Transform relative image URLs to absolute URLs
	return {
		...response,
		items: response.items.map((photo) => ({
			...photo,
			thumbnailUrl: toAbsoluteUrl(photo.thumbnailUrl),
			fullUrl: toAbsoluteUrl(photo.fullUrl)
		}))
	};
}

/**
 * Bulk remove faces from a person (unlabel faces in selected photos).
 * @param personId - The person ID
 * @param photoIds - Array of photo IDs to unlabel
 */
export async function bulkRemoveFromPerson(
	personId: string,
	photoIds: number[]
): Promise<BulkRemoveResponse> {
	return apiRequest<BulkRemoveResponse>(
		`/api/v1/faces/persons/${encodeURIComponent(personId)}/photos/bulk-remove`,
		{
			method: 'POST',
			body: JSON.stringify({ photoIds })
		}
	);
}

/**
 * Bulk move faces to another person (relabel faces in selected photos).
 * @param fromPersonId - Source person ID
 * @param photoIds - Array of photo IDs to move
 * @param destination - Target person (either `{ toPersonId }` or `{ toPersonName }`)
 */
export async function bulkMoveToPerson(
	fromPersonId: string,
	photoIds: number[],
	destination: { toPersonId: string } | { toPersonName: string }
): Promise<BulkMoveResponse> {
	return apiRequest<BulkMoveResponse>(
		`/api/v1/faces/persons/${encodeURIComponent(fromPersonId)}/photos/bulk-move`,
		{
			method: 'POST',
			body: JSON.stringify({ photoIds, ...destination })
		}
	);
}

// ============ Face Detection API Functions ============

/**
 * Detect faces in a specific asset.
 * @param assetId - The asset ID to process
 * @param minConfidence - Minimum detection confidence (0-1)
 * @param minFaceSize - Minimum face size in pixels
 */
export async function detectFaces(
	assetId: number,
	minConfidence: number = 0.5,
	minFaceSize: number = 20
): Promise<DetectFacesResponse> {
	return apiRequest<DetectFacesResponse>(`/api/v1/faces/detect/${assetId}`, {
		method: 'POST',
		body: JSON.stringify({ minConfidence, minFaceSize })
	});
}

/**
 * Trigger face clustering on unlabeled faces.
 * @param qualityThreshold - Minimum face quality (0-1)
 * @param maxFaces - Maximum faces to process
 * @param minClusterSize - Minimum cluster size
 */
export async function triggerClustering(
	qualityThreshold: number = 0.5,
	maxFaces: number = 50000,
	minClusterSize: number = 5
): Promise<ClusteringResultResponse> {
	return apiRequest<ClusteringResultResponse>('/api/v1/faces/cluster', {
		method: 'POST',
		body: JSON.stringify({ qualityThreshold, maxFaces, minClusterSize })
	});
}

/**
 * Get all detected faces for a specific asset.
 * @param assetId - The asset ID
 */
export async function getFacesForAsset(assetId: number): Promise<{
	items: FaceInstance[];
	total: number;
	page: number;
	pageSize: number;
}> {
	return apiRequest(`/api/v1/faces/assets/${assetId}`);
}

// ============ Face Assignment API Functions ============

/**
 * Assign a face to a person.
 * @param faceId - The face instance ID
 * @param personId - The target person ID
 */
export async function assignFaceToPerson(
	faceId: string,
	personId: string
): Promise<AssignFaceResponse> {
	return apiRequest<AssignFaceResponse>(
		`/api/v1/faces/faces/${encodeURIComponent(faceId)}/assign`,
		{
			method: 'POST',
			body: JSON.stringify({ personId })
		}
	);
}

/**
 * Unassign a face from its currently assigned person.
 * The face returns to unassigned state and can be reassigned later.
 * @param faceId - The face instance ID
 */
export async function unassignFace(faceId: string): Promise<UnassignFaceResponse> {
	return apiRequest<UnassignFaceResponse>(
		`/api/v1/faces/faces/${encodeURIComponent(faceId)}/person`,
		{
			method: 'DELETE'
		}
	);
}

// ============ Face Detection Session Types ============

/** Face detection session status. */
export type FaceDetectionStatus =
	| 'pending'
	| 'processing'
	| 'completed'
	| 'failed'
	| 'paused'
	| 'cancelled';

/** A face detection batch processing session. */
export interface FaceDetectionSession {
	id: string;
	trainingSessionId: number | null;
	status: FaceDetectionStatus;
	totalImages: number;
	processedImages: number;
	failedImages: number;
	facesDetected: number;
	facesAssigned: number;
	minConfidence: number;
	minFaceSize: number;
	batchSize: number;
	lastError: string | null;
	createdAt: string;
	startedAt: string | null;
	completedAt: string | null;
	jobId: string | null;
	progressPercent: number;
	// New fields (optional for backward compatibility with backend)
	facesAssignedToPersons?: number;
	clustersCreated?: number;
	suggestionsCreated?: number;
	currentBatch?: number;
	totalBatches?: number;
}

/** Paginated list of face detection sessions. */
export interface FaceDetectionSessionListResponse {
	items: FaceDetectionSession[];
	total: number;
	page: number;
	pageSize: number;
}

/** Request to create a new face detection session. */
export interface CreateFaceDetectionSessionRequest {
	trainingSessionId?: number;
	minConfidence?: number;
	minFaceSize?: number;
	batchSize?: number;
}

/** Progress update for face detection session (SSE). */
export interface FaceDetectionProgress {
	sessionId: string;
	status: string;
	totalImages: number;
	processedImages: number;
	failedImages: number;
	facesDetected: number;
	facesAssigned: number;
	progressPercent: number;
	lastError: string | null;
	// New fields (optional for backward compatibility)
	facesAssignedToPersons?: number;
	clustersCreated?: number;
	suggestionsCreated?: number;
	currentBatch?: number;
	totalBatches?: number;
}

// ============ Face Detection Session API Functions ============

/**
 * List face detection sessions with pagination.
 * @param page - Page number (1-indexed)
 * @param pageSize - Items per page (1-100)
 * @param status - Filter by status
 */
export async function listFaceDetectionSessions(
	page: number = 1,
	pageSize: number = 20,
	status?: FaceDetectionStatus
): Promise<FaceDetectionSessionListResponse> {
	const params = new URLSearchParams({
		page: page.toString(),
		page_size: pageSize.toString()
	});
	if (status) {
		params.set('status', status);
	}
	return apiRequest<FaceDetectionSessionListResponse>(
		`/api/v1/faces/sessions?${params.toString()}`
	);
}

/**
 * Get a single face detection session.
 * @param sessionId - The session ID (UUID)
 */
export async function getFaceDetectionSession(sessionId: string): Promise<FaceDetectionSession> {
	return apiRequest<FaceDetectionSession>(
		`/api/v1/faces/sessions/${encodeURIComponent(sessionId)}`
	);
}

/**
 * Create a new face detection session.
 * @param request - Session configuration options
 */
export async function createFaceDetectionSession(
	request: CreateFaceDetectionSessionRequest = {}
): Promise<FaceDetectionSession> {
	return apiRequest<FaceDetectionSession>('/api/v1/faces/sessions', {
		method: 'POST',
		body: JSON.stringify({
			training_session_id: request.trainingSessionId,
			min_confidence: request.minConfidence ?? 0.5,
			min_face_size: request.minFaceSize ?? 20,
			batch_size: request.batchSize ?? 16
		})
	});
}

/**
 * Pause a running face detection session.
 * @param sessionId - The session ID (UUID)
 */
export async function pauseFaceDetectionSession(sessionId: string): Promise<FaceDetectionSession> {
	return apiRequest<FaceDetectionSession>(
		`/api/v1/faces/sessions/${encodeURIComponent(sessionId)}/pause`,
		{
			method: 'POST'
		}
	);
}

/**
 * Resume a paused face detection session.
 * @param sessionId - The session ID (UUID)
 */
export async function resumeFaceDetectionSession(sessionId: string): Promise<FaceDetectionSession> {
	return apiRequest<FaceDetectionSession>(
		`/api/v1/faces/sessions/${encodeURIComponent(sessionId)}/resume`,
		{
			method: 'POST'
		}
	);
}

/**
 * Cancel a face detection session.
 * @param sessionId - The session ID (UUID)
 */
export async function cancelFaceDetectionSession(sessionId: string): Promise<{ status: string }> {
	return apiRequest<{ status: string }>(`/api/v1/faces/sessions/${encodeURIComponent(sessionId)}`, {
		method: 'DELETE'
	});
}

/**
 * Subscribe to face detection progress via Server-Sent Events.
 * @param sessionId - The session ID (UUID)
 * @param onProgress - Callback for progress updates
 * @param onComplete - Callback for completion
 * @param onError - Callback for errors
 * @returns Cleanup function to close the EventSource
 */
export function subscribeFaceDetectionProgress(
	sessionId: string,
	onProgress: (data: FaceDetectionProgress) => void,
	onComplete?: (data: FaceDetectionProgress) => void,
	onError?: (error: string) => void
): () => void {
	const eventSource = new EventSource(
		`${API_BASE_URL}/api/v1/faces/sessions/${encodeURIComponent(sessionId)}/events`
	);

	eventSource.addEventListener('progress', (event) => {
		const data = JSON.parse(event.data);
		onProgress(data);
	});

	eventSource.addEventListener('complete', (event) => {
		const data = JSON.parse(event.data);
		onComplete?.(data);
		eventSource.close();
	});

	eventSource.addEventListener('error', (event) => {
		if (event instanceof MessageEvent) {
			const data = JSON.parse(event.data);
			onError?.(data.error);
		}
		eventSource.close();
	});

	eventSource.onerror = () => {
		eventSource.close();
	};

	// Return cleanup function
	return () => eventSource.close();
}

// ============ Face Suggestion Types ============

/** A face labeling suggestion for review. */
export interface FaceSuggestion {
	id: number;
	faceInstanceId: string;
	suggestedPersonId: string;
	confidence: number;
	sourceFaceId: string;
	status: 'pending' | 'accepted' | 'rejected' | 'expired';
	createdAt: string;
	reviewedAt: string | null;
	faceThumbnailUrl: string | null;
	personName: string | null;
}

/** A person suggestion item for a face based on face recognition. */
export interface FaceSuggestionItem {
	personId: string;
	personName: string;
	confidence: number;
}

/** Response from fetching face suggestions for a specific face. */
export interface FaceSuggestionsResponse {
	faceId: string;
	suggestions: FaceSuggestionItem[];
	thresholdUsed: number;
}

/** Enhanced FaceInPhoto with suggestions state. */
export interface FaceInPhotoWithSuggestions extends FaceInPhoto {
	suggestions?: FaceSuggestionItem[];
	suggestionsLoading?: boolean;
	suggestionsError?: string | null;
}

/** Paginated list of face suggestions. */
export interface FaceSuggestionListResponse {
	items: FaceSuggestion[];
	total: number;
	page: number;
	pageSize: number;
}

/** Response from bulk suggestion action. */
export interface BulkSuggestionActionResponse {
	processed: number;
	failed: number;
	errors: string[];
}

// ============ Face Suggestion API Functions ============

/**
 * List face suggestions with pagination.
 * @param page - Page number (1-indexed)
 * @param pageSize - Items per page (1-100)
 * @param status - Filter by status (pending, accepted, rejected, expired)
 * @param personId - Filter by person ID
 */
export async function listSuggestions(
	page: number = 1,
	pageSize: number = 20,
	status?: string,
	personId?: string
): Promise<FaceSuggestionListResponse> {
	const params = new URLSearchParams({
		page: page.toString(),
		page_size: pageSize.toString()
	});
	if (status) params.set('status', status);
	if (personId) params.set('person_id', personId);

	return apiRequest<FaceSuggestionListResponse>(`/api/v1/faces/suggestions?${params.toString()}`);
}

/**
 * Accept a face suggestion (assigns face to suggested person).
 * @param suggestionId - The suggestion ID
 */
export async function acceptSuggestion(suggestionId: number): Promise<FaceSuggestion> {
	return apiRequest<FaceSuggestion>(`/api/v1/faces/suggestions/${suggestionId}/accept`, {
		method: 'POST',
		body: JSON.stringify({})
	});
}

/**
 * Reject a face suggestion.
 * @param suggestionId - The suggestion ID
 */
export async function rejectSuggestion(suggestionId: number): Promise<FaceSuggestion> {
	return apiRequest<FaceSuggestion>(`/api/v1/faces/suggestions/${suggestionId}/reject`, {
		method: 'POST',
		body: JSON.stringify({})
	});
}

/**
 * Perform bulk action on multiple suggestions.
 * @param suggestionIds - Array of suggestion IDs
 * @param action - Action to perform (accept or reject)
 */
export async function bulkSuggestionAction(
	suggestionIds: number[],
	action: 'accept' | 'reject'
): Promise<BulkSuggestionActionResponse> {
	return apiRequest<BulkSuggestionActionResponse>('/api/v1/faces/suggestions/bulk-action', {
		method: 'POST',
		body: JSON.stringify({ suggestionIds, action })
	});
}

/**
 * Fetch person suggestions for a face based on face recognition.
 * Returns a list of persons ranked by similarity to the provided face.
 * @param faceId - UUID of the face instance
 * @param options - Optional parameters
 * @returns Promise with suggestions sorted by confidence (highest first)
 */
export async function getFaceSuggestions(
	faceId: string,
	options?: {
		minConfidence?: number; // Minimum confidence threshold (0.0-1.0, default 0.7)
		limit?: number; // Maximum number of suggestions to return (default 5)
		signal?: AbortSignal; // For request cancellation
	}
): Promise<FaceSuggestionsResponse> {
	const params = new URLSearchParams();
	if (options?.minConfidence !== undefined) {
		params.set('min_confidence', options.minConfidence.toString());
	}
	if (options?.limit !== undefined) {
		params.set('limit', options.limit.toString());
	}

	const queryString = params.toString();
	const endpoint = `/api/v1/faces/faces/${encodeURIComponent(faceId)}/suggestions${queryString ? `?${queryString}` : ''}`;

	return apiRequest<FaceSuggestionsResponse>(endpoint, {
		signal: options?.signal
	});
}
