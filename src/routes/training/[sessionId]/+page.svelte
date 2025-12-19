<script lang="ts">
	import type { TrainingSession } from '$lib/types';
	import { getSession } from '$lib/api/training';
	import SessionDetailView from '$lib/components/training/SessionDetailView.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// Initialize session directly from page data (not via $effect to avoid timing issues)
	let session = $state<TrainingSession>(data.session);

	async function handleSessionUpdate() {
		try {
			session = await getSession(session.id);
		} catch (err) {
			console.error('Failed to update session:', err);
		}
	}
</script>

<div class="session-detail-page">
	<SessionDetailView {session} onSessionUpdate={handleSessionUpdate} />
</div>

<style>
	.session-detail-page {
		width: 100%;
		max-width: 1400px;
		margin: 0 auto;
	}
</style>
