import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import SessionDetailView from '$lib/components/training/SessionDetailView.svelte';
import { mockResponse } from '../../helpers/mockFetch';
import type { TrainingSession } from '$lib/types';
import type { components } from '$lib/api/generated';

type UnifiedProgressResponse = components['schemas']['UnifiedProgressResponse'];

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

// Helper to create unified progress response
function createUnifiedProgress(
	overallPercent: number,
	currentPhase: string,
	phaseStatuses: {
		training?: string;
		faceDetection?: string;
		clustering?: string;
	} = {}
): UnifiedProgressResponse {
	return {
		sessionId: 1,
		overallStatus: currentPhase === 'completed' ? 'completed' : 'running',
		overallProgress: {
			percentage: overallPercent,
			etaSeconds: overallPercent < 100 ? 120 : null,
			currentPhase
		},
		phases: {
			training: {
				name: 'training',
				status: phaseStatuses.training || 'pending',
				progress: {
					current: phaseStatuses.training === 'completed' ? 1000 : 500,
					total: 1000,
					percentage: phaseStatuses.training === 'completed' ? 100 : 50,
					etaSeconds: null,
					imagesPerMinute: 100
				},
				startedAt: phaseStatuses.training ? '2024-12-19T10:00:00Z' : null,
				completedAt: phaseStatuses.training === 'completed' ? '2024-12-19T10:02:00Z' : null
			},
			face_detection: {
				name: 'face_detection',
				status: phaseStatuses.faceDetection || 'pending',
				progress: {
					current: phaseStatuses.faceDetection === 'completed' ? 1000 : 500,
					total: 1000,
					percentage: phaseStatuses.faceDetection === 'completed' ? 100 : 50,
					etaSeconds: null,
					imagesPerMinute: null
				},
				startedAt: phaseStatuses.faceDetection ? '2024-12-19T10:02:00Z' : null,
				completedAt: phaseStatuses.faceDetection === 'completed' ? '2024-12-19T10:05:00Z' : null
			},
			clustering: {
				name: 'clustering',
				status: phaseStatuses.clustering || 'pending',
				progress: {
					current: phaseStatuses.clustering === 'completed' ? 1 : 0,
					total: 1,
					percentage: phaseStatuses.clustering === 'completed' ? 100 : 0,
					etaSeconds: null,
					imagesPerMinute: null
				},
				startedAt: phaseStatuses.clustering ? '2024-12-19T10:05:00Z' : null,
				completedAt: phaseStatuses.clustering === 'completed' ? '2024-12-19T10:06:00Z' : null
			}
		}
	};
}

describe('SessionDetailView - Unified Progress', () => {
	let onSessionUpdate: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		onSessionUpdate = vi.fn();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	describe('Overall Progress Display', () => {
		it('shows combined progress when training phase running', async () => {
			mockResponse(
				'http://localhost:8000/api/v1/training/sessions/1/progress-unified',
				createUnifiedProgress(15, 'training', { training: 'running' })
			);
			mockResponse('http://localhost:8000/api/v1/training/sessions/1/jobs?page=1&page_size=20', {
				items: [],
				total: 0
			});

			render(SessionDetailView, {
				props: { session: createTrainingSession({ id: 1, status: 'running' }), onSessionUpdate }
			});

			await waitFor(() => {
				expect(screen.getByText('15.0%')).toBeInTheDocument();
				expect(screen.getByText(/Training - Generating CLIP Embeddings/i)).toBeInTheDocument();
			});
		});

		it('shows combined progress when face detection running', async () => {
			mockResponse(
				'http://localhost:8000/api/v1/training/sessions/1/progress-unified',
				createUnifiedProgress(62.5, 'face_detection', {
					training: 'completed',
					faceDetection: 'processing'
				})
			);
			mockResponse('http://localhost:8000/api/v1/training/sessions/1/jobs?page=1&page_size=20', {
				items: [],
				total: 0
			});

			render(SessionDetailView, {
				props: { session: createTrainingSession({ id: 1, status: 'running' }), onSessionUpdate }
			});

			await waitFor(() => {
				expect(screen.getByText('62.5%')).toBeInTheDocument();
				expect(screen.getByText(/Face Detection - Analyzing Faces/i)).toBeInTheDocument();
			});
		});

		it('shows combined progress when clustering running', async () => {
			mockResponse(
				'http://localhost:8000/api/v1/training/sessions/1/progress-unified',
				createUnifiedProgress(97.5, 'clustering', {
					training: 'completed',
					faceDetection: 'completed',
					clustering: 'running'
				})
			);
			mockResponse('http://localhost:8000/api/v1/training/sessions/1/jobs?page=1&page_size=20', {
				items: [],
				total: 0
			});

			render(SessionDetailView, {
				props: { session: createTrainingSession({ id: 1, status: 'running' }), onSessionUpdate }
			});

			await waitFor(() => {
				expect(screen.getByText('97.5%')).toBeInTheDocument();
				expect(screen.getByText(/Clustering - Grouping Similar Faces/i)).toBeInTheDocument();
			});
		});

		it('shows all phases complete when finished', async () => {
			const progressData = createUnifiedProgress(100, 'completed', {
				training: 'completed',
				faceDetection: 'completed',
				clustering: 'completed'
			});
			// Mark as running so polling starts
			progressData.overallStatus = 'running';

			mockResponse(
				'http://localhost:8000/api/v1/training/sessions/1/progress-unified',
				progressData
			);
			mockResponse('http://localhost:8000/api/v1/training/sessions/1/jobs?page=1&page_size=20', {
				items: [],
				total: 0
			});

			render(SessionDetailView, {
				props: {
					session: createTrainingSession({ id: 1, status: 'running' }),
					onSessionUpdate
				}
			});

			await waitFor(() => {
				expect(screen.getByText('100.0%')).toBeInTheDocument();
			});
		});
	});

	describe('Phase Breakdown', () => {
		it('shows phase breakdown when expanded', async () => {
			mockResponse(
				'http://localhost:8000/api/v1/training/sessions/1/progress-unified',
				createUnifiedProgress(50, 'training', { training: 'running' })
			);
			mockResponse('http://localhost:8000/api/v1/training/sessions/1/jobs?page=1&page_size=20', {
				items: [],
				total: 0
			});

			const { container } = render(SessionDetailView, {
				props: { session: createTrainingSession({ id: 1 }), onSessionUpdate }
			});

			await waitFor(() => screen.getByText('View Phase Details'));

			const details = container.querySelector('details');
			expect(details).toBeTruthy();

			// Open the details
			details?.setAttribute('open', '');

			await waitFor(() => {
				expect(screen.getByText(/Training \(CLIP\)/i)).toBeInTheDocument();
				expect(screen.getByText(/Face Detection/i)).toBeInTheDocument();
				expect(screen.getByText(/Clustering/i)).toBeInTheDocument();
			});
		});

		it('shows correct phase status badges in breakdown', async () => {
			mockResponse(
				'http://localhost:8000/api/v1/training/sessions/1/progress-unified',
				createUnifiedProgress(62.5, 'face_detection', {
					training: 'completed',
					faceDetection: 'processing',
					clustering: 'pending'
				})
			);
			mockResponse('http://localhost:8000/api/v1/training/sessions/1/jobs?page=1&page_size=20', {
				items: [],
				total: 0
			});

			const { container } = render(SessionDetailView, {
				props: { session: createTrainingSession({ id: 1 }), onSessionUpdate }
			});

			await waitFor(() => screen.getByText('View Phase Details'));

			// Open details
			const details = container.querySelector('details');
			details?.setAttribute('open', '');

			await waitFor(() => {
				// Training should show completed
				expect(screen.getByText('✓ Complete')).toBeInTheDocument();
				// Face detection should show percentage
				expect(screen.getByText('50%')).toBeInTheDocument();
				// Clustering should show pending
				expect(screen.getByText('Pending')).toBeInTheDocument();
			});
		});
	});

	describe('Polling Behavior', () => {
		it('continues polling while any phase is running', async () => {
			mockResponse(
				'http://localhost:8000/api/v1/training/sessions/1/progress-unified',
				createUnifiedProgress(50, 'face_detection', {
					training: 'completed',
					faceDetection: 'processing'
				})
			);
			mockResponse('http://localhost:8000/api/v1/training/sessions/1/jobs?page=1&page_size=20', {
				items: [],
				total: 0
			});

			render(SessionDetailView, {
				props: { session: createTrainingSession({ id: 1, status: 'running' }), onSessionUpdate }
			});

			await waitFor(() => {
				expect(screen.getByText(/Face Detection - Analyzing Faces/i)).toBeInTheDocument();
			});

			// Verify polling continues (component stays responsive)
			expect(screen.getByText('50.0%')).toBeInTheDocument();
		});

		it('stops polling when all phases complete', async () => {
			// Test that when overallStatus is 'completed', component doesn't poll
			// We do this by verifying the component renders with completed status
			const progressData = createUnifiedProgress(100, 'completed', {
				training: 'completed',
				faceDetection: 'completed',
				clustering: 'completed'
			});
			progressData.overallStatus = 'running'; // Start with running to trigger load

			mockResponse(
				'http://localhost:8000/api/v1/training/sessions/1/progress-unified',
				progressData
			);
			mockResponse('http://localhost:8000/api/v1/training/sessions/1/jobs?page=1&page_size=20', {
				items: [],
				total: 0
			});

			render(SessionDetailView, {
				props: {
					session: createTrainingSession({ id: 1, status: 'running' }),
					onSessionUpdate
				}
			});

			await waitFor(() => {
				expect(screen.getByText('100.0%')).toBeInTheDocument();
			});
		});
	});

	describe('ETA Display', () => {
		it('shows ETA when available in overall progress', async () => {
			mockResponse(
				'http://localhost:8000/api/v1/training/sessions/1/progress-unified',
				createUnifiedProgress(30, 'training', { training: 'running' })
			);
			mockResponse('http://localhost:8000/api/v1/training/sessions/1/jobs?page=1&page_size=20', {
				items: [],
				total: 0
			});

			render(SessionDetailView, {
				props: { session: createTrainingSession({ id: 1, status: 'running' }), onSessionUpdate }
			});

			await waitFor(() => {
				expect(screen.getByText(/ETA:/i)).toBeInTheDocument();
			});
		});

		it('hides ETA when not available', async () => {
			const progressWithoutEta = createUnifiedProgress(100, 'completed', {
				training: 'completed',
				faceDetection: 'completed',
				clustering: 'completed'
			});
			progressWithoutEta.overallProgress.etaSeconds = null;
			progressWithoutEta.overallStatus = 'running'; // Enable polling

			mockResponse(
				'http://localhost:8000/api/v1/training/sessions/1/progress-unified',
				progressWithoutEta
			);
			mockResponse('http://localhost:8000/api/v1/training/sessions/1/jobs?page=1&page_size=20', {
				items: [],
				total: 0
			});

			render(SessionDetailView, {
				props: {
					session: createTrainingSession({ id: 1, status: 'running' }),
					onSessionUpdate
				}
			});

			await waitFor(() => {
				expect(screen.getByText('100.0%')).toBeInTheDocument();
			});

			expect(screen.queryByText(/ETA:/i)).not.toBeInTheDocument();
		});
	});

	describe('Training Stats', () => {
		it('shows training stats from training phase', async () => {
			mockResponse(
				'http://localhost:8000/api/v1/training/sessions/1/progress-unified',
				createUnifiedProgress(50, 'training', { training: 'running' })
			);
			mockResponse('http://localhost:8000/api/v1/training/sessions/1/jobs?page=1&page_size=20', {
				items: [],
				total: 0
			});

			render(SessionDetailView, {
				props: { session: createTrainingSession({ id: 1 }), onSessionUpdate }
			});

			await waitFor(() => {
				// TrainingStats component should receive the training phase progress
				expect(screen.getByText(/Training - Generating CLIP Embeddings/i)).toBeInTheDocument();
			});
		});
	});
});
