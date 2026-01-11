<script lang="ts">
	import { onMount } from 'svelte';
	import {
		listFaceDetectionSessions,
		createFaceDetectionSession,
		type FaceDetectionSession
	} from '$lib/api/faces';
	import FaceDetectionSessionCard from '$lib/components/faces/FaceDetectionSessionCard.svelte';
	import { registerComponent } from '$lib/dev/componentRegistry.svelte';

	// Component tracking (DEV only)
	const cleanup = registerComponent('routes/faces/sessions/+page', {
		filePath: 'src/routes/faces/sessions/+page.svelte'
	});

	let sessions = $state<FaceDetectionSession[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let page = $state(1);
	let total = $state(0);
	let pageSize = 10;

	let isCreating = $state(false);

	async function loadSessions() {
		loading = true;
		error = null;
		try {
			const response = await listFaceDetectionSessions(page, pageSize);
			sessions = response.items;
			total = response.total;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load sessions';
		} finally {
			loading = false;
		}
	}

	async function handleCreateSession() {
		isCreating = true;
		try {
			await createFaceDetectionSession({});
			await loadSessions();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to create session';
		} finally {
			isCreating = false;
		}
	}

	onMount(() => {
		loadSessions();
		return cleanup;
	});

	let totalPages = $derived(Math.ceil(total / pageSize));
</script>

<svelte:head>
	<title>Face Detection Sessions | Image Search</title>
</svelte:head>

<div class="container mx-auto px-4 py-6">
	<div class="flex justify-between items-center mb-6">
		<h1 class="text-2xl font-bold text-gray-800">Face Detection Sessions</h1>
		<button
			class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
			onclick={handleCreateSession}
			disabled={isCreating}
		>
			{isCreating ? 'Creating...' : 'New Session'}
		</button>
	</div>

	{#if error}
		<div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
			<p class="text-red-700">{error}</p>
		</div>
	{/if}

	{#if loading}
		<div class="flex justify-center py-12">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
		</div>
	{:else if sessions.length === 0}
		<div class="text-center py-12 bg-gray-50 rounded-lg">
			<p class="text-gray-500 mb-4">No face detection sessions found.</p>
			<p class="text-sm text-gray-400">
				Create a new session to start detecting faces in your images.
			</p>
		</div>
	{:else}
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each sessions as session (session.id)}
				<FaceDetectionSessionCard {session} onUpdate={loadSessions} />
			{/each}
		</div>

		<!-- Pagination -->
		{#if totalPages > 1}
			<div class="flex justify-center gap-2 mt-6">
				<button
					class="px-3 py-1 rounded border disabled:opacity-50"
					onclick={() => {
						page--;
						loadSessions();
					}}
					disabled={page <= 1}
				>
					Previous
				</button>
				<span class="px-3 py-1">
					Page {page} of {totalPages}
				</span>
				<button
					class="px-3 py-1 rounded border disabled:opacity-50"
					onclick={() => {
						page++;
						loadSessions();
					}}
					disabled={page >= totalPages}
				>
					Next
				</button>
			</div>
		{/if}
	{/if}
</div>
