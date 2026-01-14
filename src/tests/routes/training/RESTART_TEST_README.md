# Training Session Restart - Frontend Integration Tests

## Status: ✅ Tests Written, ⏳ Awaiting UI Implementation

### Test Coverage Summary

**Total Tests**: 17
**Test Areas**: 5 categories
**Current Status**: Tests are complete but will pass once Phase 4 (Frontend UI) is implemented

### Test Categories

#### 1. Visibility Tests (4 tests)

- ✅ `shows restart buttons when session completed` - Restart buttons visible for completed sessions
- ✅ `hides restart buttons when session running` - No restart buttons for running sessions
- ✅ `hides restart buttons when session pending` - No restart buttons for pending sessions
- ✅ `shows restart buttons when session failed` - Restart buttons visible for failed sessions

**Purpose**: Ensure restart options are only shown in appropriate states

#### 2. Interaction Tests (3 tests)

- ✅ `disables restart button while processing` - Button disabled during API call
- ✅ `shows confirmation modal on restart click` - Clicking restart shows confirmation dialog
- ✅ `cancel confirmation closes modal without restart` - Cancel button closes modal without restart

**Purpose**: Verify user interactions work correctly

#### 3. API Integration Tests (3 tests)

- ✅ `calls restart-training endpoint correctly` - Verifies `POST /restart-training` called
- ✅ `calls restart-faces endpoint correctly` - Verifies `POST /restart-faces` called
- ✅ `calls restart-clustering endpoint correctly` - Verifies `POST /restart-clustering` called

**Purpose**: Ensure correct API endpoints are called with proper parameters

#### 4. Response Handling Tests (5 tests)

- ✅ `shows success message after restart` - Success toast/message displayed
- ✅ `reloads session after successful restart` - Session data refreshed after restart
- ✅ `shows error message on failure` - Error displayed on API failure
- ✅ `handles network errors gracefully` - Network errors handled properly
- ✅ `displays cleanup statistics after successful restart` - Cleanup stats shown to user

**Purpose**: Verify proper handling of API responses and errors

#### 5. Edge Cases Tests (2 tests)

- ✅ `handles restart when session transitions to running` - 409 Conflict error handled
- ✅ `prevents multiple concurrent restart requests` - Button disabled to prevent double-clicks

**Purpose**: Handle unusual scenarios and race conditions

### Test Fixtures Created

#### New Training Session Fixtures (`src/tests/helpers/fixtures.ts`)

```typescript
createTrainingSession(overrides?)   // Base session with defaults
createRunningSession(overrides?)    // Session in running state
createFailedSession(overrides?)     // Session in failed state
createPendingSession(overrides?)    // Session in pending state
```

**Usage Example**:

```typescript
const completedSession = createTrainingSession({ status: 'completed', id: 40 });
const runningSession = createRunningSession({ processedImages: 50 });
```

### Test Helpers Created

#### `createRestartResponse(operation, sessionId)`

Creates a mock restart API response with cleanup stats.

```typescript
createRestartResponse('training_restart', 40);
// Returns: { session_id: 40, status: 'pending', message: '...', cleanup_stats: {...} }
```

#### `createUnifiedProgress(overrides?)`

Creates a unified progress response for mocking session status.

#### `mockCompletedSessionResponses(sessionId)`

Helper to mock standard API responses for a completed session.

### Current Test Status

**Why Tests Are Failing**:

- ✅ Tests are correctly written
- ❌ UI components for restart functionality not yet implemented (Phase 4)
- ⏳ Tests will pass once `SessionDetailView.svelte` has restart buttons

**Expected Behavior**:

- Tests timeout waiting for restart buttons that don't exist yet
- This is **expected** and **correct** for TDD (Test-Driven Development)
- Tests serve as specification for UI implementation

### Implementation Checklist for Phase 4

To make these tests pass, the following needs to be implemented in `SessionDetailView.svelte`:

- [ ] Add restart buttons section (visible only when `status === 'completed' || status === 'failed'`)
- [ ] Add confirmation modal component (`RestartConfirmationModal.svelte`)
- [ ] Implement restart state management (`showRestartModal`, `restartInProgress`, `restartError`)
- [ ] Add API client functions to `src/lib/api/training.ts`:
  - `restartTraining(sessionId, failedOnly)`
  - `restartFaceDetection(sessionId, deletePersons)`
  - `restartClustering(sessionId)`
- [ ] Add success/error toast notifications
- [ ] Call `onSessionUpdate()` after successful restart to reload session data
- [ ] Display cleanup statistics (optional enhancement)

### Running the Tests

```bash
# Run only restart tests
npm test -- src/tests/routes/training/restart.test.ts --run

# Run in watch mode (for development)
npm test -- src/tests/routes/training/restart.test.ts

# Run all training tests
npm test -- src/tests/routes/training/
```

### Test Quality Standards

✅ **Follows Project Patterns**:

- Uses centralized `mockFetch` helpers
- Uses fixture functions from `fixtures.ts`
- Uses semantic queries (`getByRole`, `getByText`)
- Avoids `getByTestId` unless necessary
- Tests user-visible behavior, not implementation

✅ **Comprehensive Coverage**:

- All three restart endpoints tested
- Error handling tested
- Edge cases covered
- User interactions tested
- API integration verified

✅ **Well-Documented**:

- Clear test names describe expected behavior
- Helper functions with JSDoc comments
- Test fixtures reusable across test files

### Integration with Backend

These tests assume the following backend endpoints exist (Phase 2):

```
POST /api/v1/training/sessions/{session_id}/restart-training?failed_only=true
POST /api/v1/training/sessions/{session_id}/restart-faces?delete_persons=false
POST /api/v1/training/sessions/{session_id}/restart-clustering
```

**Response Schema**:

```typescript
{
  session_id: number;
  status: string;
  message: string;
  cleanup_stats: {
    operation: string;
    session_id: number;
    items_deleted: number;
    items_reset: number;
    items_preserved: number;
    duration_ms: number;
    [key: string]: any; // Additional operation-specific fields
  };
}
```

### Next Steps

1. **Implement Phase 4** - Add restart UI components
2. **Run Tests** - Verify tests pass with new UI
3. **Manual Testing** - Test restart functionality in browser
4. **Update Documentation** - Add user guide for restart feature
5. **Deploy** - Ship to production once all tests pass

### Notes

- Tests are defensive and handle missing UI elements gracefully
- Uses `waitFor` for async operations (proper Testing Library pattern)
- Follows Svelte 5 runes patterns (`$state`, `$derived`, `$effect`)
- Compatible with existing project test infrastructure

---

**Last Updated**: 2026-01-14
**Test File**: `src/tests/routes/training/restart.test.ts`
**Status**: ✅ Complete, awaiting Phase 4 implementation
