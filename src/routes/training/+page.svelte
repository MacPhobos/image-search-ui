<script lang="ts">
	import { goto } from '$app/navigation';
	import type { TrainingSession } from '$lib/types';
	import { listSessions } from '$lib/api/training';
	import TrainingSessionList from '$lib/components/training/TrainingSessionList.svelte';
	import CreateSessionModal from '$lib/components/training/CreateSessionModal.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let sessions = $state<TrainingSession[]>([]);
	let total = $state(0);
	let currentPage = $state(1);
	let pageSize = $state(50);
	let loading = $state(false);
	let showCreateModal = $state(false);

	const totalPages = $derived(Math.ceil(total / pageSize));

	// Initialize from page data
	$effect(() => {
		sessions = data.sessions;
		total = data.total;
		currentPage = data.page;
		pageSize = data.pageSize;
	});

	async function loadSessions(page: number) {
		loading = true;
		try {
			const response = await listSessions(page, pageSize);
			sessions = response.items;
			total = response.total;
			currentPage = response.page;
		} catch (err) {
			console.error('Failed to load sessions:', err);
		} finally {
			loading = false;
		}
	}

	function handlePageChange(page: number) {
		currentPage = page;
		loadSessions(page);
	}

	function handleSessionDeleted() {
		loadSessions(currentPage);
	}

	function handleCreateSession() {
		showCreateModal = true;
	}

	function handleSessionCreated(sessionId: number) {
		showCreateModal = false;
		goto(`/training/${sessionId}`);
	}

	function handleCloseModal() {
		showCreateModal = false;
	}
</script>

<div class="training-page">
	<TrainingSessionList
		{sessions}
		{currentPage}
		{totalPages}
		onPageChange={handlePageChange}
		onSessionDeleted={handleSessionDeleted}
		onCreateSession={handleCreateSession}
		{loading}
	/>
</div>

{#if showCreateModal}
	<CreateSessionModal onClose={handleCloseModal} onSessionCreated={handleSessionCreated} />
{/if}

<style>
	.training-page {
		width: 100%;
		max-width: 1400px;
		margin: 0 auto;
	}
</style>
