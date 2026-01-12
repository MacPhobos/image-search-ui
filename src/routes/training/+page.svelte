<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { TrainingSession } from '$lib/types';
	import { listSessions } from '$lib/api/training';
	import TrainingSessionList from '$lib/components/training/TrainingSessionList.svelte';
	import CreateSessionModal from '$lib/components/training/CreateSessionModal.svelte';
	import type { PageData } from './$types';
	import {
		listFaceDetectionSessions,
		createFaceDetectionSession,
		type FaceDetectionSession
	} from '$lib/api/faces';
	import FaceDetectionSessionCard from '$lib/components/faces/FaceDetectionSessionCard.svelte';
	import * as Tabs from '$lib/components/ui/tabs';
	import { registerComponent } from '$lib/dev/componentRegistry.svelte';

	// Component tracking (DEV only) - cleanup on unmount
	const cleanup = registerComponent('routes/training/+page', {
		filePath: 'src/routes/training/+page.svelte'
	});

	// Cleanup component tracking on unmount only
	$effect(() => {
		return cleanup;
	});

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// Tab state with URL sync
	let activeTab = $state<'training' | 'face-detection'>('training');

	// URL sync on mount - read from URL
	$effect(() => {
		const tabParam = $page.url.searchParams.get('tab');
		if (tabParam === 'face-detection') {
			activeTab = 'face-detection';
		} else {
			activeTab = 'training';
		}
	});

	// URL sync on tab change - write to URL
	function onTabChange(value: string | undefined) {
		if (!value) return;
		activeTab = value as 'training' | 'face-detection';
		const url = new URL($page.url);
		url.searchParams.set('tab', value);
		goto(url.toString(), { replaceState: true, noScroll: true });
	}

	// Training sessions state
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

	// Face Detection Sessions state
	let faceSessions = $state<FaceDetectionSession[]>([]);
	let faceLoading = $state(true);
	let faceError = $state<string | null>(null);
	let facePage = $state(1);
	let faceTotal = $state(0);
	let facePageSize = 10;
	let isCreatingFaceSession = $state(false);

	let faceTotalPages = $derived(Math.ceil(faceTotal / facePageSize));

	async function loadFaceSessions() {
		faceLoading = true;
		faceError = null;
		try {
			const response = await listFaceDetectionSessions(facePage, facePageSize);
			faceSessions = response.items;
			faceTotal = response.total;
		} catch (e) {
			faceError = e instanceof Error ? e.message : 'Failed to load sessions';
		} finally {
			faceLoading = false;
		}
	}

	async function handleCreateFaceSession() {
		isCreatingFaceSession = true;
		try {
			await createFaceDetectionSession({});
			await loadFaceSessions();
		} catch (e) {
			faceError = e instanceof Error ? e.message : 'Failed to create session';
		} finally {
			isCreatingFaceSession = false;
		}
	}

	// Load face detection sessions only when on that tab
	$effect(() => {
		if (activeTab === 'face-detection') {
			loadFaceSessions();
		}
	});
</script>

<svelte:head>
	<title>Training | Image Search</title>
</svelte:head>

<div class="training-page">
	<Tabs.Root value={activeTab} onValueChange={onTabChange}>
		<Tabs.List class="mb-6 w-full justify-start">
			<Tabs.Trigger value="training">Training Sessions</Tabs.Trigger>
			<Tabs.Trigger value="face-detection">Face Detection Sessions</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value="training">
			<TrainingSessionList
				{sessions}
				{currentPage}
				{totalPages}
				onPageChange={handlePageChange}
				onSessionDeleted={handleSessionDeleted}
				onCreateSession={handleCreateSession}
				{loading}
			/>
		</Tabs.Content>

		<Tabs.Content value="face-detection">
			<div class="face-sessions-container">
				<div class="flex justify-between items-center mb-6">
					<h1 class="text-2xl font-bold text-gray-800">Face Detection Sessions</h1>
					<button
						class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
						onclick={handleCreateFaceSession}
						disabled={isCreatingFaceSession}
					>
						{isCreatingFaceSession ? 'Creating...' : 'New Session'}
					</button>
				</div>

				{#if faceError}
					<div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
						<p class="text-red-700">{faceError}</p>
					</div>
				{/if}

				{#if faceLoading}
					<div class="flex justify-center py-12">
						<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					</div>
				{:else if faceSessions.length === 0}
					<div class="text-center py-12 bg-gray-50 rounded-lg">
						<p class="text-gray-500 mb-4">No face detection sessions found.</p>
						<p class="text-sm text-gray-400">
							Create a new session to start detecting faces in your images.
						</p>
					</div>
				{:else}
					<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{#each faceSessions as session (session.id)}
							<FaceDetectionSessionCard {session} onUpdate={loadFaceSessions} />
						{/each}
					</div>

					<!-- Pagination -->
					{#if faceTotalPages > 1}
						<div class="flex justify-center gap-2 mt-6">
							<button
								class="px-3 py-1 rounded border disabled:opacity-50"
								onclick={() => {
									facePage--;
									loadFaceSessions();
								}}
								disabled={facePage <= 1}
							>
								Previous
							</button>
							<span class="px-3 py-1">
								Page {facePage} of {faceTotalPages}
							</span>
							<button
								class="px-3 py-1 rounded border disabled:opacity-50"
								onclick={() => {
									facePage++;
									loadFaceSessions();
								}}
								disabled={facePage >= faceTotalPages}
							>
								Next
							</button>
						</div>
					{/if}
				{/if}
			</div>
		</Tabs.Content>
	</Tabs.Root>
</div>

<CreateSessionModal
	bind:open={showCreateModal}
	onClose={handleCloseModal}
	onSessionCreated={handleSessionCreated}
/>

<style>
	.training-page {
		width: 100%;
		max-width: 1400px;
		margin: 0 auto;
	}

	.face-sessions-container {
		padding: 0;
	}
</style>
