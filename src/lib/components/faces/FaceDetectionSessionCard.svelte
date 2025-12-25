<script lang="ts">
  import type { FaceDetectionSession } from '$lib/api/faces';
  import {
    pauseFaceDetectionSession,
    resumeFaceDetectionSession,
    cancelFaceDetectionSession,
    subscribeFaceDetectionProgress
  } from '$lib/api/faces';

  let { session, onUpdate } = $props<{
    session: FaceDetectionSession;
    onUpdate?: () => void;
  }>();

  let isLoading = $state(false);
  let cleanup: (() => void) | null = $state(null);

  // Computed values
  let progress = $derived(session.progressPercent);
  let statusColor = $derived(() => {
    switch (session.status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'processing': return 'text-blue-600 bg-blue-100';
      case 'paused': return 'text-yellow-600 bg-yellow-100';
      case 'cancelled': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  });

  // Subscribe to SSE when processing
  $effect(() => {
    if (session.status === 'processing' && !cleanup) {
      cleanup = subscribeFaceDetectionProgress(
        session.id,
        (data) => {
          // Update session with progress data
          session = { ...session, ...data };
        },
        () => {
          // On complete, trigger refresh
          onUpdate?.();
        }
      );
    }

    return () => {
      cleanup?.();
      cleanup = null;
    };
  });

  async function handlePause() {
    isLoading = true;
    try {
      await pauseFaceDetectionSession(session.id);
      onUpdate?.();
    } finally {
      isLoading = false;
    }
  }

  async function handleResume() {
    isLoading = true;
    try {
      await resumeFaceDetectionSession(session.id);
      onUpdate?.();
    } finally {
      isLoading = false;
    }
  }

  async function handleCancel() {
    if (!confirm('Are you sure you want to cancel this session?')) return;
    isLoading = true;
    try {
      await cancelFaceDetectionSession(session.id);
      onUpdate?.();
    } finally {
      isLoading = false;
    }
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
  }
</script>

<div class="bg-white rounded-lg shadow-md p-4 border border-gray-200">
  <!-- Header -->
  <div class="flex justify-between items-center mb-3">
    <h3 class="font-semibold text-gray-800">
      Face Detection Session
    </h3>
    <span class="px-2 py-1 text-xs font-medium rounded-full {statusColor()}">
      {session.status}
    </span>
  </div>

  <!-- Progress Bar -->
  {#if session.status === 'processing' || session.status === 'paused'}
    <div class="mb-3">
      <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          class="h-full bg-blue-500 transition-all duration-300"
          style="width: {progress}%"
        ></div>
      </div>
      <p class="text-sm text-gray-500 mt-1">
        {session.processedImages} / {session.totalImages} images ({progress.toFixed(1)}%)
      </p>
    </div>
  {/if}

  <!-- Stats Grid -->
  <div class="grid grid-cols-2 gap-2 text-sm mb-3">
    <div>
      <span class="text-gray-500">Faces detected:</span>
      <span class="font-medium ml-1">{session.facesDetected}</span>
    </div>
    <div>
      <span class="text-gray-500">Auto-assigned:</span>
      <span class="font-medium ml-1">{session.facesAssigned}</span>
    </div>
    <div>
      <span class="text-gray-500">Failed:</span>
      <span class="font-medium text-red-600 ml-1">{session.failedImages}</span>
    </div>
    <div>
      <span class="text-gray-500">Started:</span>
      <span class="font-medium ml-1">{formatDate(session.startedAt)}</span>
    </div>
  </div>

  <!-- Error Message -->
  {#if session.lastError}
    <div class="bg-red-50 border border-red-200 rounded p-2 mb-3">
      <p class="text-sm text-red-700">{session.lastError}</p>
    </div>
  {/if}

  <!-- Actions -->
  {#if session.status === 'processing' || session.status === 'paused'}
    <div class="flex gap-2 mt-4">
      {#if session.status === 'processing'}
        <button
          class="px-3 py-1.5 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 disabled:opacity-50"
          onclick={handlePause}
          disabled={isLoading}
        >
          Pause
        </button>
      {:else if session.status === 'paused'}
        <button
          class="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
          onclick={handleResume}
          disabled={isLoading}
        >
          Resume
        </button>
      {/if}
      <button
        class="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
        onclick={handleCancel}
        disabled={isLoading}
      >
        Cancel
      </button>
    </div>
  {/if}
</div>
