<script lang="ts">
	import type { TrainingSession } from '$lib/types';
	import { getSession } from '$lib/api/training';
	import SessionDetailView from '$lib/components/training/SessionDetailView.svelte';
	import type { PageData } from './$types';
	import { registerComponent } from '$lib/dev/componentRegistry.svelte';
	import { setViewId } from '$lib/dev/viewId';
	import { onMount } from 'svelte';

	// Component tracking (DEV only)
	const cleanup = registerComponent('routes/training/[sessionId]/+page', {
		filePath: 'src/routes/training/[sessionId]/+page.svelte'
	});

	// DEV: Set view ID for DevOverlay breadcrumb and component cleanup
	onMount(() => {
		if (import.meta.env.DEV) {
			const clearViewId = setViewId('page:/training/[sessionId]');
			return () => {
				cleanup();
				clearViewId?.();
			};
		}
		return cleanup;
	});

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// Initialize session from page data (synced via effect to avoid state_referenced_locally warning)
	let session = $state<TrainingSession | null>(null);

	// Initialize and sync session when data changes
	$effect(() => {
		session = data.session;
	});

	async function handleSessionUpdate() {
		try {
			if (session) {
				session = await getSession(session.id);
			}
		} catch (err) {
			console.error('Failed to update session:', err);
		}
	}
</script>

<div class="session-detail-page">
	{#if session}
		<SessionDetailView {session} onSessionUpdate={handleSessionUpdate} />
	{/if}
</div>

<style>
	.session-detail-page {
		width: 100%;
		max-width: 1400px;
		margin: 0 auto;
	}
</style>
