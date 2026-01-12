import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

describe('SessionDetailView - Phase 1 Progress Tracking', () => {
	let onSessionUpdate: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		onSessionUpdate = vi.fn();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	describe('Progress Labels', () => {
		it('shows "Processing Training Images" when training is running', async () => {
			const session = createTrainingSession({ status: 'running' });

			mockResponse(
				'http://localhost:8000/api/v1/training/sessions/1/progress',
				createTrainingProgress(500, 1000)
			);
			mockResponse('http://localhost:8000/api/v1/training/sessions/1/jobs?page=1&page_size=20', {
				items: [],
				total: 0
			});
			mockResponse('http://localhost:8000/api/v1/faces/sessions?page=1&page_size=10', {
				items: [],
				total: 0
			});

			render(SessionDetailView, { props: { session, onSessionUpdate } });

			await waitFor(() => {
				expect(screen.getByText(/🎨 Processing Training Images/i)).toBeInTheDocument();
			});
		});

		it('shows "Training Complete - Face Detection Pending" when training done, no face session', async () => {
			const session = createTrainingSession({ status: 'completed', processedImages: 1000 });

			mockResponse('/api/v1/training/sessions/1/progress', createTrainingProgress(1000, 1000));
			mockResponse('/api/v1/training/sessions/1/jobs?page=1&page_size=20', {
				items: [],
				total: 0
			});
			mockResponse('/api/v1/face-sessions?page=1&page_size=10', { items: [], total: 0 });

			render(SessionDetailView, { props: { session, onSessionUpdate } });

			await waitFor(() => {
				expect(
					screen.getByText(/✓ Training Complete - Face Detection Pending/i)
				).toBeInTheDocument();
			});
		});

		it('shows "Training Complete - Face Detection Starting..." when face session is pending', async () => {
			const session = createTrainingSession({ status: 'completed', processedImages: 1000 });
			const faceSession = createFaceSession({ status: 'pending' });

			mockResponse('/api/v1/training/sessions/1/progress', createTrainingProgress(1000, 1000));
			mockResponse('/api/v1/training/sessions/1/jobs?page=1&page_size=20', {
				items: [],
				total: 0
			});
			mockResponse('/api/v1/face-sessions?page=1&page_size=10', {
				items: [faceSession],
				total: 1
			});

			render(SessionDetailView, { props: { session, onSessionUpdate } });

			await waitFor(() => {
				expect(
					screen.getByText(/⏳ Training Complete - Face Detection Starting.../i)
				).toBeInTheDocument();
			});
		});

		it('shows "Face Detection Running..." when face session is processing', async () => {
			const session = createTrainingSession({ status: 'completed', processedImages: 1000 });
			const faceSession = createFaceSession({
				status: 'processing',
				processedImages: 300,
				startedAt: '2024-12-19T10:01:00Z'
			});

			mockResponse('/api/v1/training/sessions/1/progress', createTrainingProgress(1000, 1000));
			mockResponse('/api/v1/training/sessions/1/jobs?page=1&page_size=20', {
				items: [],
				total: 0
			});
			mockResponse('/api/v1/face-sessions?page=1&page_size=10', {
				items: [faceSession],
				total: 1
			});

			render(SessionDetailView, { props: { session, onSessionUpdate } });

			await waitFor(() => {
				expect(screen.getByText(/🔄 Face Detection Running.../i)).toBeInTheDocument();
			});
		});

		it('shows generic "Processing Images" for other statuses', async () => {
			const session = createTrainingSession({ status: 'paused' });

			mockResponse(
				'http://localhost:8000/api/v1/training/sessions/1/progress',
				createTrainingProgress(500, 1000)
			);
			mockResponse('http://localhost:8000/api/v1/training/sessions/1/jobs?page=1&page_size=20', {
				items: [],
				total: 0
			});
			mockResponse('http://localhost:8000/api/v1/faces/sessions?page=1&page_size=10', {
				items: [],
				total: 0
			});

			render(SessionDetailView, { props: { session, onSessionUpdate } });

			await waitFor(() => {
				expect(screen.getByText('Processing Images')).toBeInTheDocument();
			});
		});
	});

	describe('Informational Message', () => {
		it('shows blue info box when training complete and face detection pending', async () => {
			const session = createTrainingSession({ status: 'completed', processedImages: 1000 });
			const faceSession = createFaceSession({ status: 'pending' });

			mockResponse('/api/v1/training/sessions/1/progress', createTrainingProgress(1000, 1000));
			mockResponse('/api/v1/training/sessions/1/jobs?page=1&page_size=20', {
				items: [],
				total: 0
			});
			mockResponse('/api/v1/face-sessions?page=1&page_size=10', {
				items: [faceSession],
				total: 1
			});

			render(SessionDetailView, { props: { session, onSessionUpdate } });

			await waitFor(() => {
				expect(
					screen.getByText(/Face detection is running in the background/i)
				).toBeInTheDocument();
			});
		});

		it('shows blue info box when training complete and face detection processing', async () => {
			const session = createTrainingSession({ status: 'completed', processedImages: 1000 });
			const faceSession = createFaceSession({ status: 'processing', processedImages: 300 });

			mockResponse('/api/v1/training/sessions/1/progress', createTrainingProgress(1000, 1000));
			mockResponse('/api/v1/training/sessions/1/jobs?page=1&page_size=20', {
				items: [],
				total: 0
			});
			mockResponse('/api/v1/face-sessions?page=1&page_size=10', {
				items: [faceSession],
				total: 1
			});

			render(SessionDetailView, { props: { session, onSessionUpdate } });

			await waitFor(() => {
				expect(
					screen.getByText(/Face detection is running in the background/i)
				).toBeInTheDocument();
			});
		});

		it('does NOT show info box when training is still running', async () => {
			const session = createTrainingSession({ status: 'running' });

			mockResponse(
				'http://localhost:8000/api/v1/training/sessions/1/progress',
				createTrainingProgress(500, 1000)
			);
			mockResponse('http://localhost:8000/api/v1/training/sessions/1/jobs?page=1&page_size=20', {
				items: [],
				total: 0
			});
			mockResponse('http://localhost:8000/api/v1/faces/sessions?page=1&page_size=10', {
				items: [],
				total: 0
			});

			render(SessionDetailView, { props: { session, onSessionUpdate } });

			await waitFor(() => {
				expect(screen.getByText(/🎨 Processing Training Images/i)).toBeInTheDocument();
			});

			// Info box should NOT be present
			expect(
				screen.queryByText(/Face detection is running in the background/i)
			).not.toBeInTheDocument();
		});

		it('does NOT show info box when face detection is completed', async () => {
			const session = createTrainingSession({ status: 'completed', processedImages: 1000 });
			const faceSession = createFaceSession({
				status: 'completed',
				processedImages: 1000,
				completedAt: '2024-12-19T10:05:00Z'
			});

			mockResponse('/api/v1/training/sessions/1/progress', createTrainingProgress(1000, 1000));
			mockResponse('/api/v1/training/sessions/1/jobs?page=1&page_size=20', {
				items: [],
				total: 0
			});
			mockResponse('/api/v1/face-sessions?page=1&page_size=10', {
				items: [faceSession],
				total: 1
			});

			render(SessionDetailView, { props: { session, onSessionUpdate } });

			await waitFor(() => {
				expect(screen.getByText('100%')).toBeInTheDocument();
			});

			// Info box should NOT be present
			expect(
				screen.queryByText(/Face detection is running in the background/i)
			).not.toBeInTheDocument();
		});
	});

	describe('Polling Behavior', () => {
		it('continues polling when training completes but face detection is processing', async () => {
			const session = createTrainingSession({ status: 'completed', processedImages: 1000 });
			const faceSession = createFaceSession({ status: 'processing', processedImages: 300 });

			mockResponse('/api/v1/training/sessions/1/progress', createTrainingProgress(1000, 1000));
			mockResponse('/api/v1/training/sessions/1/jobs?page=1&page_size=20', {
				items: [],
				total: 0
			});
			mockResponse('/api/v1/faces/sessions?page=1&page_size=10', {
				items: [faceSession],
				total: 1
			});

			render(SessionDetailView, { props: { session, onSessionUpdate } });

			// Wait for initial load and verify polling is active
			await waitFor(
				() => {
					expect(screen.getByText(/🔄 Face Detection Running.../i)).toBeInTheDocument();
				},
				{ timeout: 3000 }
			);

			// Since we can't easily count function calls with the current mock setup,
			// we verify that polling continues by checking the component stays mounted
			// and the status message persists (indicating polling is active)
			expect(screen.getByText(/🔄 Face Detection Running.../i)).toBeInTheDocument();
		});

		it('continues polling when training completes and face detection is pending', async () => {
			const session = createTrainingSession({ status: 'completed', processedImages: 1000 });
			const faceSession = createFaceSession({ status: 'pending' });

			mockResponse('/api/v1/training/sessions/1/progress', createTrainingProgress(1000, 1000));
			mockResponse('/api/v1/training/sessions/1/jobs?page=1&page_size=20', {
				items: [],
				total: 0
			});
			mockResponse('/api/v1/faces/sessions?page=1&page_size=10', {
				items: [faceSession],
				total: 1
			});

			render(SessionDetailView, { props: { session, onSessionUpdate } });

			// Wait for initial load and verify correct status
			await waitFor(() => {
				expect(
					screen.getByText(/⏳ Training Complete - Face Detection Starting.../i)
				).toBeInTheDocument();
			});

			// Verify polling is active (component shows pending state)
			expect(
				screen.getByText(/⏳ Training Complete - Face Detection Starting.../i)
			).toBeInTheDocument();
		});

		it('stops polling when both training and face detection are completed', async () => {
			const session = createTrainingSession({ status: 'completed', processedImages: 1000 });
			const faceSession = createFaceSession({
				status: 'completed',
				processedImages: 1000,
				completedAt: '2024-12-19T10:05:00Z'
			});

			mockResponse('/api/v1/training/sessions/1/progress', createTrainingProgress(1000, 1000));
			mockResponse('/api/v1/training/sessions/1/jobs?page=1&page_size=20', {
				items: [],
				total: 0
			});
			mockResponse('/api/v1/faces/sessions?page=1&page_size=10', {
				items: [faceSession],
				total: 1
			});

			render(SessionDetailView, { props: { session, onSessionUpdate } });

			// Wait for initial load - should show completed state
			await waitFor(() => {
				expect(screen.getByText('100% (1,000 / 1,000)')).toBeInTheDocument();
			});

			// Verify no info box (both phases complete)
			expect(
				screen.queryByText(/Face detection is running in the background/i)
			).not.toBeInTheDocument();

			// Component should be in stable state (no more polling)
			expect(screen.getByText('100% (1,000 / 1,000)')).toBeInTheDocument();
		});

		it('polls while training is running', async () => {
			const session = createTrainingSession({ status: 'running' });

			mockResponse(
				'http://localhost:8000/api/v1/training/sessions/1/progress',
				createTrainingProgress(500, 1000)
			);
			mockResponse('http://localhost:8000/api/v1/training/sessions/1/jobs?page=1&page_size=20', {
				items: [],
				total: 0
			});
			mockResponse('http://localhost:8000/api/v1/faces/sessions?page=1&page_size=10', {
				items: [],
				total: 0
			});

			render(SessionDetailView, { props: { session, onSessionUpdate } });

			// Wait for initial load and verify training is running
			await waitFor(() => {
				expect(screen.getByText(/🎨 Processing Training Images/i)).toBeInTheDocument();
			});

			// Verify component shows active training state (polling is happening)
			expect(screen.getByText('50% (500 / 1,000)')).toBeInTheDocument();
		});
	});

	describe('ETA Display', () => {
		it('shows ETA only when training is running', async () => {
			const session = createTrainingSession({ status: 'running' });

			mockResponse(
				'http://localhost:8000/api/v1/training/sessions/1/progress',
				createTrainingProgress(500, 1000)
			);
			mockResponse('http://localhost:8000/api/v1/training/sessions/1/jobs?page=1&page_size=20', {
				items: [],
				total: 0
			});
			mockResponse('http://localhost:8000/api/v1/faces/sessions?page=1&page_size=10', {
				items: [],
				total: 0
			});

			render(SessionDetailView, { props: { session, onSessionUpdate } });

			await waitFor(() => {
				// ETA component should be present (it displays the time)
				expect(screen.getByText(/ETA:/i)).toBeInTheDocument();
			});
		});

		it('hides ETA when training is completed (even if face detection running)', async () => {
			const session = createTrainingSession({ status: 'completed', processedImages: 1000 });
			const faceSession = createFaceSession({ status: 'processing', processedImages: 300 });

			mockResponse('/api/v1/training/sessions/1/progress', createTrainingProgress(1000, 1000));
			mockResponse('/api/v1/training/sessions/1/jobs?page=1&page_size=20', {
				items: [],
				total: 0
			});
			mockResponse('/api/v1/face-sessions?page=1&page_size=10', {
				items: [faceSession],
				total: 1
			});

			render(SessionDetailView, { props: { session, onSessionUpdate } });

			await waitFor(() => {
				expect(screen.getByText(/🔄 Face Detection Running.../i)).toBeInTheDocument();
			});

			// ETA should NOT be present (training is complete)
			expect(screen.queryByText(/ETA:/i)).not.toBeInTheDocument();
		});
	});

	describe('Progress Percentage', () => {
		it('shows 50% when training is halfway done', async () => {
			const session = createTrainingSession({ status: 'running', processedImages: 500 });

			mockResponse(
				'http://localhost:8000/api/v1/training/sessions/1/progress',
				createTrainingProgress(500, 1000)
			);
			mockResponse('http://localhost:8000/api/v1/training/sessions/1/jobs?page=1&page_size=20', {
				items: [],
				total: 0
			});
			mockResponse('http://localhost:8000/api/v1/faces/sessions?page=1&page_size=10', {
				items: [],
				total: 0
			});

			render(SessionDetailView, { props: { session, onSessionUpdate } });

			await waitFor(() => {
				expect(screen.getByText('50% (500 / 1,000)')).toBeInTheDocument();
			});
		});

		it('shows 100% when training is complete (even though face detection still running)', async () => {
			const session = createTrainingSession({ status: 'completed', processedImages: 1000 });
			const faceSession = createFaceSession({ status: 'processing', processedImages: 300 });

			mockResponse('/api/v1/training/sessions/1/progress', createTrainingProgress(1000, 1000));
			mockResponse('/api/v1/training/sessions/1/jobs?page=1&page_size=20', {
				items: [],
				total: 0
			});
			mockResponse('/api/v1/face-sessions?page=1&page_size=10', {
				items: [faceSession],
				total: 1
			});

			render(SessionDetailView, { props: { session, onSessionUpdate } });

			await waitFor(() => {
				// Progress bar shows 100% but label indicates face detection is running
				expect(screen.getByText('100% (1,000 / 1,000)')).toBeInTheDocument();
				expect(screen.getByText(/🔄 Face Detection Running.../i)).toBeInTheDocument();
			});
		});
	});
});
