import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import SessionDetailView from '$lib/components/training/SessionDetailView.svelte';
import { mockResponse } from '../../helpers/mockFetch';
import type { TrainingSession, TrainingProgress } from '$lib/types';
import type { FaceDetectionSession } from '$lib/api/faces';

// Helper to create training session
function createTrainingSession(overrides?: Partial<TrainingSession>): TrainingSession {
	return {
		id: 1,
		name: 'Test Training Session',
		rootPath: '/test/photos',
		status: 'running',
		createdAt: '2024-12-19T10:00:00Z',
		startedAt: '2024-12-19T10:00:00Z',
		completedAt: null,
		totalImages: 1000,
		processedImages: 500,
		failedImages: 0,
		skippedImages: 0,
		categoryId: null,
		...overrides
	} as TrainingSession;
}

// Helper to create training progress
function createTrainingProgress(current: number = 500, total: number = 1000): TrainingProgress {
	return {
		sessionId: 1,
		progress: {
			current,
			total,
			percentage: total > 0 ? Math.round((current / total) * 100) : 0,
			etaSeconds: 30,
			imagesPerMinute: 100
		}
	} as TrainingProgress;
}

// Helper to create face detection session
function createFaceSession(overrides?: Partial<FaceDetectionSession>): FaceDetectionSession {
	return {
		id: 'face-session-1',
		trainingSessionId: 1,
		status: 'pending',
		totalImages: 1000,
		processedImages: 0,
		failedImages: 0,
		facesDetected: 0,
		facesAssigned: 0,
		minConfidence: 0.7,
		minFaceSize: 20,
		batchSize: 8,
		lastError: null,
		createdAt: '2024-12-19T10:01:00Z',
		startedAt: null,
		completedAt: null,
		jobId: null,
		progressPercent: 0,
		...overrides
	};
}

describe('SessionDetailView - Phase 1 Progress Labels', () => {
	let onSessionUpdate: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		onSessionUpdate = vi.fn();

		// Mock all API endpoints with proper responses
		mockResponse(
			'http://localhost:8000/api/v1/training/sessions/1/progress',
			createTrainingProgress(500, 1000)
		);
		mockResponse('http://localhost:8000/api/v1/training/sessions/1/jobs?page=1&page_size=20', {
			items: [],
			total: 0
		});
	});

	it('shows "Processing Training Images" when training is running', async () => {
		const session = createTrainingSession({ status: 'running' });

		mockResponse('http://localhost:8000/api/v1/faces/sessions?page=1&page_size=10', {
			items: [],
			total: 0
		});

		render(SessionDetailView, { props: { session, onSessionUpdate } });

		await waitFor(
			() => {
				const label = screen.getByText(/🎨 Processing Training Images/i);
				expect(label).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);
	});

	it('shows "Training Complete - Face Detection Pending" when training done, no face session yet', async () => {
		const session = createTrainingSession({
			status: 'completed',
			processedImages: 1000,
			completedAt: '2024-12-19T10:01:00Z'
		});

		mockResponse(
			'http://localhost:8000/api/v1/training/sessions/1/progress',
			createTrainingProgress(1000, 1000)
		);
		mockResponse('http://localhost:8000/api/v1/faces/sessions?page=1&page_size=10', {
			items: [],
			total: 0
		});

		render(SessionDetailView, { props: { session, onSessionUpdate } });

		await waitFor(
			() => {
				const label = screen.getByText(/✓ Training Complete - Face Detection Pending/i);
				expect(label).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);
	});

	it('shows "Training Complete - Face Detection Starting..." when face session is pending', async () => {
		const session = createTrainingSession({
			status: 'completed',
			processedImages: 1000,
			completedAt: '2024-12-19T10:01:00Z'
		});
		const faceSession = createFaceSession({ status: 'pending' });

		mockResponse(
			'http://localhost:8000/api/v1/training/sessions/1/progress',
			createTrainingProgress(1000, 1000)
		);
		mockResponse('http://localhost:8000/api/v1/faces/sessions?page=1&page_size=10', {
			items: [faceSession],
			total: 1,
			page: 1,
			pageSize: 10
		});

		render(SessionDetailView, { props: { session, onSessionUpdate } });

		await waitFor(
			() => {
				const label = screen.getByText(/⏳ Training Complete - Face Detection Starting.../i);
				expect(label).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);
	});

	it('shows "Face Detection Running..." when face session is processing', async () => {
		const session = createTrainingSession({
			status: 'completed',
			processedImages: 1000,
			completedAt: '2024-12-19T10:01:00Z'
		});
		const faceSession = createFaceSession({
			status: 'processing',
			processedImages: 300,
			startedAt: '2024-12-19T10:01:30Z'
		});

		mockResponse(
			'http://localhost:8000/api/v1/training/sessions/1/progress',
			createTrainingProgress(1000, 1000)
		);
		mockResponse('http://localhost:8000/api/v1/faces/sessions?page=1&page_size=10', {
			items: [faceSession],
			total: 1,
			page: 1,
			pageSize: 10
		});

		render(SessionDetailView, { props: { session, onSessionUpdate } });

		await waitFor(
			() => {
				const label = screen.getByText(/🔄 Face Detection Running.../i);
				expect(label).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);
	});

	it('shows informational message when training complete but face detection active', async () => {
		const session = createTrainingSession({
			status: 'completed',
			processedImages: 1000,
			completedAt: '2024-12-19T10:01:00Z'
		});
		const faceSession = createFaceSession({
			status: 'processing',
			processedImages: 300
		});

		mockResponse(
			'http://localhost:8000/api/v1/training/sessions/1/progress',
			createTrainingProgress(1000, 1000)
		);
		mockResponse('http://localhost:8000/api/v1/faces/sessions?page=1&page_size=10', {
			items: [faceSession],
			total: 1,
			page: 1,
			pageSize: 10
		});

		render(SessionDetailView, { props: { session, onSessionUpdate } });

		await waitFor(
			() => {
				const infoMessage = screen.getByText(/Face detection is running in the background/i);
				expect(infoMessage).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);

		// Also verify the blue info box styling
		const infoBox = screen.getByText(/Face detection is running in the background/i).closest('div');
		expect(infoBox).toHaveClass('text-blue-600');
		expect(infoBox).toHaveClass('bg-blue-50');
	});

	it('does NOT show info message when training is still running', async () => {
		const session = createTrainingSession({ status: 'running' });

		mockResponse('http://localhost:8000/api/v1/faces/sessions?page=1&page_size=10', {
			items: [],
			total: 0
		});

		render(SessionDetailView, { props: { session, onSessionUpdate } });

		await waitFor(
			() => {
				expect(screen.getByText(/🎨 Processing Training Images/i)).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);

		// Info box should NOT be present
		expect(
			screen.queryByText(/Face detection is running in the background/i)
		).not.toBeInTheDocument();
	});

	it('shows 100% progress but indicates face detection is running', async () => {
		const session = createTrainingSession({
			status: 'completed',
			processedImages: 1000,
			completedAt: '2024-12-19T10:01:00Z'
		});
		const faceSession = createFaceSession({
			status: 'processing',
			processedImages: 300
		});

		mockResponse(
			'http://localhost:8000/api/v1/training/sessions/1/progress',
			createTrainingProgress(1000, 1000)
		);
		mockResponse('http://localhost:8000/api/v1/faces/sessions?page=1&page_size=10', {
			items: [faceSession],
			total: 1,
			page: 1,
			pageSize: 10
		});

		render(SessionDetailView, { props: { session, onSessionUpdate } });

		await waitFor(
			() => {
				// Progress shows 100%
				expect(screen.getByText('100% (1,000 / 1,000)')).toBeInTheDocument();
				// But label indicates face detection is running
				expect(screen.getByText(/🔄 Face Detection Running.../i)).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);
	});
});
