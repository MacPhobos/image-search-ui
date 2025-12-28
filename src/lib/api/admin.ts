/**
 * Admin API client functions for system-wide administrative operations.
 *
 * @example
 * ```typescript
 * // Delete all application data
 * const result = await deleteAllData({
 *   confirm: true,
 *   confirmationText: 'DELETE ALL DATA',
 *   reason: 'Development reset'
 * });
 * console.log(result.message);
 *
 * // Export person metadata
 * const exportData = await exportPersonMetadata(100);
 * console.log(`Exported ${exportData.metadata.totalPersons} persons`);
 *
 * // Import person metadata (dry run first)
 * const dryRunResult = await importPersonMetadata(exportData, { dryRun: true });
 * console.log(`Would create ${dryRunResult.personsCreated} persons`);
 *
 * // Actual import
 * const importResult = await importPersonMetadata(exportData);
 * console.log(`Created ${importResult.personsCreated} persons, matched ${importResult.totalFacesMatched} faces`);
 * ```
 */

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
				errorData?.message ||
					errorData?.detail ||
					`HTTP ${response.status}: ${response.statusText}`,
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

// Types

export interface DeleteAllDataRequest {
	confirm: boolean;
	confirmationText: string;
	reason?: string;
}

export interface DeleteAllDataResponse {
	qdrantCollectionsDeleted: Record<string, number>;
	postgresTruncated: Record<string, number>;
	alembicVersionPreserved: string;
	message: string;
	timestamp: string;
}

// Export types
export interface BoundingBoxExport {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface FaceMappingExport {
	imagePath: string;
	boundingBox: BoundingBoxExport;
	detectionConfidence: number;
	qualityScore: number | null;
}

export interface PersonExport {
	name: string;
	status: string;
	faceMappings: FaceMappingExport[];
}

export interface ExportMetadata {
	totalPersons: number;
	totalFaceMappings: number;
	exportFormat: string;
}

export interface PersonMetadataExport {
	version: string;
	exportedAt: string;
	metadata: ExportMetadata;
	persons: PersonExport[];
}

// Import types
export interface ImportOptions {
	dryRun?: boolean;
	tolerancePixels?: number;
	skipMissingImages?: boolean;
	autoIngestImages?: boolean;
}

export interface ImportRequest {
	data: PersonMetadataExport;
	options?: ImportOptions;
}

export interface FaceMappingResult {
	imagePath: string;
	status: 'matched' | 'not_found' | 'image_missing' | 'detection_failed';
	matchedFaceId: string | null;
	error: string | null;
}

export interface PersonImportResult {
	name: string;
	status: 'created' | 'existing' | 'error';
	personId: string | null;
	facesMatched: number;
	facesNotFound: number;
	imagesMissing: number;
	details: FaceMappingResult[];
}

export interface ImportResponse {
	success: boolean;
	dryRun: boolean;
	personsCreated: number;
	personsExisting: number;
	totalFacesMatched: number;
	totalFacesNotFound: number;
	totalImagesMissing: number;
	personResults: PersonImportResult[];
	errors: string[];
	timestamp: string;
}

// API Functions

/**
 * Delete all application data (vectors and database records).
 * Requires confirmation text "DELETE ALL DATA".
 * WARNING: This is a destructive operation that cannot be undone.
 */
export async function deleteAllData(request: DeleteAllDataRequest): Promise<DeleteAllDataResponse> {
	return apiRequest<DeleteAllDataResponse>('/api/v1/admin/data/delete-all', {
		method: 'POST',
		body: JSON.stringify(request)
	});
}

/**
 * Export all persons and their face-to-image mappings for backup.
 *
 * @param maxFacesPerPerson - Maximum face mappings per person (default: 100)
 * @returns Export data with persons and face mappings
 */
export async function exportPersonMetadata(
	maxFacesPerPerson: number = 100
): Promise<PersonMetadataExport> {
	return apiRequest<PersonMetadataExport>(
		`/api/v1/admin/persons/export?max_faces_per_person=${maxFacesPerPerson}`,
		{ method: 'POST' }
	);
}

/**
 * Import persons and face mappings from export file.
 *
 * @param data - Previously exported person metadata
 * @param options - Import options (dry_run, tolerance, etc.)
 * @returns Import results with statistics and per-person details
 */
export async function importPersonMetadata(
	data: PersonMetadataExport,
	options: ImportOptions = {}
): Promise<ImportResponse> {
	const request: ImportRequest = { data, options };
	return apiRequest<ImportResponse>('/api/v1/admin/persons/import', {
		method: 'POST',
		body: JSON.stringify(request)
	});
}
