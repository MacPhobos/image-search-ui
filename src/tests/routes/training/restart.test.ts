import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import SessionDetailView from '$lib/components/training/SessionDetailView.svelte';
import { mockResponse, mockError, assertCalled, resetMocks } from '../../helpers/mockFetch';
import type { TrainingSession } from '$lib/types';
import type { components } from '$lib/api/generated';

type UnifiedProgressResponse = components['schemas']['UnifiedProgressResponse'];

/**
 * Helper: Create a test TrainingSession with sensible defaults
 */
function createTrainingSession(overrides?: Partial<TrainingSession>): TrainingSession {
	return {
		id: 40,
		name: 'Test Session',
		rootPath: '/photos',
		status: 'completed',
		createdAt: '2024-12-19T10:00:00Z',
		startedAt: '2024-12-19T10:00:00Z',
		completedAt: '2024-12-19T10:30:00Z',
		totalImages: 100,
		processedImages: 100,
		failedImages: 0,
		skippedImages: 0,
		categoryId: null,
		...overrides
	} as TrainingSession;
}

/**
 * Helper: Create a unified progress response
 */
function createUnifiedProgress(
	overrides?: Partial<UnifiedProgressResponse>
): UnifiedProgressResponse {
	return {
		sessionId: 40,
		overallStatus: 'completed',
		overallProgress: {
			percentage: 100,
			etaSeconds: null,
			currentPhase: 'completed'
		},
		phases: {
			training: {
				name: 'training',
				status: 'completed',
				progress: {
					current: 100,
					total: 100,
					percentage: 100,
					etaSeconds: null,
					imagesPerMinute: 100
				},
				startedAt: '2024-12-19T10:00:00Z',
				completedAt: '2024-12-19T10:30:00Z'
			},
			face_detection: {
				name: 'face_detection',
				status: 'completed',
				progress: null,
				startedAt: null,
				completedAt: null
			},
			clustering: {
				name: 'clustering',
				status: 'completed',
				progress: null,
				startedAt: null,
				completedAt: null
			}
		},
		...overrides
	} as UnifiedProgressResponse;
}

/**
 * Helper: Create a restart response
 */
function createRestartResponse(operation: string, sessionId: number = 40) {
	return {
		session_id: sessionId,
		status: 'pending',
		message: `${operation} restart initiated`,
		cleanup_stats: {
			operation,
			session_id: sessionId,
			items_deleted: 50,
			items_reset: 10,
			items_preserved: 5,
			duration_ms: 150
		}
	};
}

/**
 * Helper: Mock the standard responses for a completed session
 */
function mockCompletedSessionResponses(sessionId: number = 40) {
	mockResponse(`/api/v1/training/sessions/${sessionId}/progress-unified`, createUnifiedProgress());
	mockResponse(`/api/v1/training/sessions/${sessionId}/jobs?page=1&page_size=20`, {
		items: [],
		total: 0
	});
}

describe('Training Session Restart UI', () => {
	let onSessionUpdate: ReturnType<typeof vi.fn>;
	let user: ReturnType<typeof userEvent.setup>;

	beforeEach(() => {
		onSessionUpdate = vi.fn();
		user = userEvent.setup();
		vi.useFakeTimers();
		resetMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	describe('Visibility', () => {
		it('shows restart buttons when session completed', async () => {
			const session = createTrainingSession({ status: 'completed' });
			mockCompletedSessionResponses(session.id);

			render(SessionDetailView, { props: { session, onSessionUpdate } });

			// Wait for component to render
			await waitFor(() => {
				// Look for restart-related text/buttons
				// Note: Exact text depends on implementation, adjust as needed
				const restartElements = screen.queryAllByText(/restart/i);
				expect(restartElements.length).toBeGreaterThan(0);
			});
		});

		it('hides restart buttons when session running', async () => {
			const session = createTrainingSession({
				status: 'running',
				processedImages: 50,
				completedAt: null
			});

			mockResponse(`/api/v1/training/sessions/${session.id}/progress-unified`, {
				...createUnifiedProgress(),
				overallStatus: 'running',
				overallProgress: {
					percentage: 50,
					etaSeconds: 60,
					currentPhase: 'training'
				},
				phases: {
					...createUnifiedProgress().phases,
					training: {
						...createUnifiedProgress().phases.training,
						status: 'running',
						progress: {
							current: 50,
							total: 100,
							percentage: 50,
							etaSeconds: 60,
							imagesPerMinute: 100
						}
					}
				}
			});
			mockResponse(`/api/v1/training/sessions/${session.id}/jobs?page=1&page_size=20`, {
				items: [],
				total: 0
			});

			render(SessionDetailView, { props: { session, onSessionUpdate } });

			await waitFor(() => {
				// Restart buttons should not be visible for running sessions
				expect(screen.queryByRole('button', { name: /restart/i })).not.toBeInTheDocument();
			});
		});

		it('hides restart buttons when session pending', async () => {
			const session = createTrainingSession({
				status: 'pending',
				processedImages: 0,
				startedAt: null,
				completedAt: null
			});

			mockResponse(`/api/v1/training/sessions/${session.id}/progress-unified`, {
				...createUnifiedProgress(),
				overallStatus: 'pending',
				overallProgress: {
					percentage: 0,
					etaSeconds: null,
					currentPhase: 'pending'
				},
				phases: {
					...createUnifiedProgress().phases,
					training: {
						...createUnifiedProgress().phases.training,
						status: 'pending',
						progress: {
							current: 0,
							total: 100,
							percentage: 0,
							etaSeconds: null,
							imagesPerMinute: null
						}
					}
				}
			});
			mockResponse(`/api/v1/training/sessions/${session.id}/jobs?page=1&page_size=20`, {
				items: [],
				total: 0
			});

			render(SessionDetailView, { props: { session, onSessionUpdate } });

			await waitFor(() => {
				expect(screen.queryByRole('button', { name: /restart/i })).not.toBeInTheDocument();
			});
		});

		it('shows restart buttons when session failed', async () => {
			const session = createTrainingSession({
				status: 'failed',
				processedImages: 50,
				failedImages: 50
			});

			mockResponse(`/api/v1/training/sessions/${session.id}/progress-unified`, {
				...createUnifiedProgress(),
				overallStatus: 'failed'
			});
			mockResponse(`/api/v1/training/sessions/${session.id}/jobs?page=1&page_size=20`, {
				items: [],
				total: 0
			});

			render(SessionDetailView, { props: { session, onSessionUpdate } });

			await waitFor(() => {
				const restartElements = screen.queryAllByText(/restart/i);
				expect(restartElements.length).toBeGreaterThan(0);
			});
		});
	});

	describe('Interactions', () => {
		it('disables restart button while processing', async () => {
			const session = createTrainingSession({ status: 'completed' });
			mockCompletedSessionResponses(session.id);

			// Mock slow API response
			mockResponse(
				`/api/v1/training/sessions/${session.id}/restart-training`,
				createRestartResponse('training_restart')
			);

			render(SessionDetailView, { props: { session, onSessionUpdate } });

			await waitFor(() => {
				expect(screen.getByText(/restart/i)).toBeInTheDocument();
			});

			const restartButton = screen.getAllByRole('button', { name: /restart/i })[0];

			// Click restart button
			await user.click(restartButton);

			// Button should be disabled during processing
			await waitFor(() => {
				expect(restartButton).toBeDisabled();
			});
		});

		it('shows confirmation modal on restart click', async () => {
			const session = createTrainingSession({ status: 'completed' });
			mockCompletedSessionResponses(session.id);

			render(SessionDetailView, { props: { session, onSessionUpdate } });

			await waitFor(() => {
				expect(screen.getByText(/restart/i)).toBeInTheDocument();
			});

			const restartButton = screen.getAllByRole('button', { name: /restart/i })[0];
			await user.click(restartButton);

			// Check for confirmation modal
			await waitFor(() => {
				expect(
					screen.getByText(/are you sure|confirm/i) || screen.getByRole('dialog')
				).toBeInTheDocument();
			});
		});

		it('cancel confirmation closes modal without restart', async () => {
			const session = createTrainingSession({ status: 'completed' });
			mockCompletedSessionResponses(session.id);

			render(SessionDetailView, { props: { session, onSessionUpdate } });

			await waitFor(() => {
				expect(screen.getByText(/restart/i)).toBeInTheDocument();
			});

			const restartButton = screen.getAllByRole('button', { name: /restart/i })[0];
			await user.click(restartButton);

			// Wait for modal to appear
			await waitFor(() => {
				expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
			});

			// Click cancel
			const cancelButton = screen.getByRole('button', { name: /cancel/i });
			await user.click(cancelButton);

			// Modal should close
			await waitFor(() => {
				expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
			});
		});
	});

	describe('API Integration', () => {
		it('calls restart-training endpoint correctly', async () => {
			const session = createTrainingSession({ status: 'completed' });
			mockCompletedSessionResponses(session.id);

			mockResponse(
				`/api/v1/training/sessions/${session.id}/restart-training`,
				createRestartResponse('training_restart', session.id)
			);

			// Mock session reload after restart
			mockResponse(`/api/v1/training/sessions/${session.id}`, {
				...session,
				status: 'pending'
			});

			render(SessionDetailView, { props: { session, onSessionUpdate } });

			await waitFor(() => {
				expect(screen.getByText(/restart.*training/i)).toBeInTheDocument();
			});

			// Click the restart training button
			const restartTrainingButton = screen.getByRole('button', { name: /restart.*training/i });
			await user.click(restartTrainingButton);

			// Confirm in modal (if confirmation exists)
			await waitFor(async () => {
				const confirmButton = screen.queryByRole('button', { name: /confirm/i });
				if (confirmButton) {
					await user.click(confirmButton);
				}
			});

			// Verify correct endpoint was called
			await waitFor(() => {
				assertCalled(`/api/v1/training/sessions/${session.id}/restart-training`);
			});
		});

		it('calls restart-faces endpoint correctly', async () => {
			const session = createTrainingSession({ status: 'completed' });
			mockCompletedSessionResponses(session.id);

			mockResponse(
				`/api/v1/training/sessions/${session.id}/restart-faces`,
				createRestartResponse('face_detection_restart', session.id)
			);

			mockResponse(`/api/v1/training/sessions/${session.id}`, {
				...session,
				status: 'completed'
			});

			render(SessionDetailView, { props: { session, onSessionUpdate } });

			await waitFor(() => {
				expect(screen.getByText(/restart.*face/i)).toBeInTheDocument();
			});

			// Click the restart faces button
			const restartFacesButton = screen.getByRole('button', { name: /restart.*face/i });
			await user.click(restartFacesButton);

			// Confirm in modal
			await waitFor(async () => {
				const confirmButton = screen.queryByRole('button', { name: /confirm/i });
				if (confirmButton) {
					await user.click(confirmButton);
				}
			});

			// Verify correct endpoint was called
			await waitFor(() => {
				assertCalled(`/api/v1/training/sessions/${session.id}/restart-faces`);
			});
		});

		it('calls restart-clustering endpoint correctly', async () => {
			const session = createTrainingSession({ status: 'completed' });
			mockCompletedSessionResponses(session.id);

			mockResponse(
				`/api/v1/training/sessions/${session.id}/restart-clustering`,
				createRestartResponse('clustering_restart', session.id)
			);

			mockResponse(`/api/v1/training/sessions/${session.id}`, {
				...session,
				status: 'completed'
			});

			render(SessionDetailView, { props: { session, onSessionUpdate } });

			await waitFor(() => {
				expect(screen.getByText(/restart.*cluster/i)).toBeInTheDocument();
			});

			// Click the restart clustering button
			const restartClusteringButton = screen.getByRole('button', {
				name: /restart.*cluster/i
			});
			await user.click(restartClusteringButton);

			// Confirm in modal
			await waitFor(async () => {
				const confirmButton = screen.queryByRole('button', { name: /confirm/i });
				if (confirmButton) {
					await user.click(confirmButton);
				}
			});

			// Verify correct endpoint was called
			await waitFor(() => {
				assertCalled(`/api/v1/training/sessions/${session.id}/restart-clustering`);
			});
		});
	});

	describe('Response Handling', () => {
		it('shows success message after restart', async () => {
			const session = createTrainingSession({ status: 'completed' });
			mockCompletedSessionResponses(session.id);

			mockResponse(
				`/api/v1/training/sessions/${session.id}/restart-training`,
				createRestartResponse('training_restart', session.id)
			);

			mockResponse(`/api/v1/training/sessions/${session.id}`, {
				...session,
				status: 'pending'
			});

			render(SessionDetailView, { props: { session, onSessionUpdate } });

			await waitFor(() => {
				expect(screen.getByText(/restart.*training/i)).toBeInTheDocument();
			});

			const restartButton = screen.getByRole('button', { name: /restart.*training/i });
			await user.click(restartButton);

			// Confirm
			await waitFor(async () => {
				const confirmButton = screen.queryByRole('button', { name: /confirm/i });
				if (confirmButton) {
					await user.click(confirmButton);
				}
			});

			// Check for success message (toast, alert, or status update)
			await waitFor(() => {
				expect(
					screen.getByText(/success|initiated|restarted/i) || screen.getByRole('status')
				).toBeInTheDocument();
			});
		});

		it('reloads session after successful restart', async () => {
			const session = createTrainingSession({ status: 'completed' });
			mockCompletedSessionResponses(session.id);

			mockResponse(
				`/api/v1/training/sessions/${session.id}/restart-faces`,
				createRestartResponse('face_detection_restart', session.id)
			);

			// Mock the updated session after restart
			mockResponse(`/api/v1/training/sessions/${session.id}`, {
				...session,
				status: 'completed'
			});

			render(SessionDetailView, { props: { session, onSessionUpdate } });

			await waitFor(() => {
				expect(screen.getByText(/restart.*face/i)).toBeInTheDocument();
			});

			const restartButton = screen.getByRole('button', { name: /restart.*face/i });
			await user.click(restartButton);

			// Confirm
			await waitFor(async () => {
				const confirmButton = screen.queryByRole('button', { name: /confirm/i });
				if (confirmButton) {
					await user.click(confirmButton);
				}
			});

			// Verify onSessionUpdate was called to reload session
			await waitFor(() => {
				expect(onSessionUpdate).toHaveBeenCalled();
			});
		});

		it('shows error message on failure', async () => {
			const session = createTrainingSession({ status: 'completed' });
			mockCompletedSessionResponses(session.id);

			mockError(
				`/api/v1/training/sessions/${session.id}/restart-training`,
				400,
				'Cannot restart running session'
			);

			render(SessionDetailView, { props: { session, onSessionUpdate } });

			await waitFor(() => {
				expect(screen.getByText(/restart.*training/i)).toBeInTheDocument();
			});

			const restartButton = screen.getByRole('button', { name: /restart.*training/i });
			await user.click(restartButton);

			// Confirm
			await waitFor(async () => {
				const confirmButton = screen.queryByRole('button', { name: /confirm/i });
				if (confirmButton) {
					await user.click(confirmButton);
				}
			});

			// Check for error message
			await waitFor(() => {
				expect(
					screen.getByText(/error|failed|cannot restart/i) || screen.getByRole('alert')
				).toBeInTheDocument();
			});
		});

		it('handles network errors gracefully', async () => {
			const session = createTrainingSession({ status: 'completed' });
			mockCompletedSessionResponses(session.id);

			mockError(
				`/api/v1/training/sessions/${session.id}/restart-clustering`,
				new Error('Network error')
			);

			render(SessionDetailView, { props: { session, onSessionUpdate } });

			await waitFor(() => {
				expect(screen.getByText(/restart.*cluster/i)).toBeInTheDocument();
			});

			const restartButton = screen.getByRole('button', { name: /restart.*cluster/i });
			await user.click(restartButton);

			// Confirm
			await waitFor(async () => {
				const confirmButton = screen.queryByRole('button', { name: /confirm/i });
				if (confirmButton) {
					await user.click(confirmButton);
				}
			});

			// Check for error handling
			await waitFor(() => {
				expect(
					screen.getByText(/error|failed|network/i) || screen.getByRole('alert')
				).toBeInTheDocument();
			});
		});

		it('displays cleanup statistics after successful restart', async () => {
			const session = createTrainingSession({ status: 'completed' });
			mockCompletedSessionResponses(session.id);

			mockResponse(`/api/v1/training/sessions/${session.id}/restart-faces`, {
				session_id: session.id,
				status: 'pending',
				message: 'Face detection restart initiated',
				cleanup_stats: {
					operation: 'face_detection_restart',
					session_id: session.id,
					items_deleted: 150,
					items_reset: 0,
					items_preserved: 5,
					duration_ms: 250,
					face_instances_deleted: 150,
					qdrant_vectors_deleted: 150,
					suggestions_deleted: 75,
					persons_deleted: 0,
					persons_orphaned: 5
				}
			});

			mockResponse(`/api/v1/training/sessions/${session.id}`, session);

			render(SessionDetailView, { props: { session, onSessionUpdate } });

			await waitFor(() => {
				expect(screen.getByText(/restart.*face/i)).toBeInTheDocument();
			});

			const restartButton = screen.getByRole('button', { name: /restart.*face/i });
			await user.click(restartButton);

			// Confirm
			await waitFor(async () => {
				const confirmButton = screen.queryByRole('button', { name: /confirm/i });
				if (confirmButton) {
					await user.click(confirmButton);
				}
			});

			// Check if cleanup stats are displayed (implementation-specific)
			await waitFor(() => {
				expect(
					screen.getByText(/150.*deleted|items.*deleted/i) ||
						screen.getByText(/cleanup|statistics/i)
				).toBeInTheDocument();
			});
		});
	});

	describe('Edge Cases', () => {
		it('handles restart when session transitions to running', async () => {
			const session = createTrainingSession({ status: 'completed' });
			mockCompletedSessionResponses(session.id);

			mockError(
				`/api/v1/training/sessions/${session.id}/restart-training`,
				409,
				'Session is currently running'
			);

			render(SessionDetailView, { props: { session, onSessionUpdate } });

			await waitFor(() => {
				expect(screen.getByText(/restart.*training/i)).toBeInTheDocument();
			});

			const restartButton = screen.getByRole('button', { name: /restart.*training/i });
			await user.click(restartButton);

			// Confirm
			await waitFor(async () => {
				const confirmButton = screen.queryByRole('button', { name: /confirm/i });
				if (confirmButton) {
					await user.click(confirmButton);
				}
			});

			// Check for error
			await waitFor(() => {
				expect(screen.getByText(/running|conflict/i)).toBeInTheDocument();
			});
		});

		it('prevents multiple concurrent restart requests', async () => {
			const session = createTrainingSession({ status: 'completed' });
			mockCompletedSessionResponses(session.id);

			mockResponse(
				`/api/v1/training/sessions/${session.id}/restart-training`,
				createRestartResponse('training_restart', session.id)
			);

			mockResponse(`/api/v1/training/sessions/${session.id}`, session);

			render(SessionDetailView, { props: { session, onSessionUpdate } });

			await waitFor(() => {
				expect(screen.getByText(/restart.*training/i)).toBeInTheDocument();
			});

			const restartButton = screen.getByRole('button', { name: /restart.*training/i });

			// Click multiple times rapidly
			await user.click(restartButton);
			await user.click(restartButton);

			// Button should be disabled to prevent double-clicking
			await waitFor(() => {
				expect(restartButton).toBeDisabled();
			});
		});
	});
});
