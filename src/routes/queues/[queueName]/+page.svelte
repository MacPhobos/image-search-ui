<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let { data }: { data: { queueName: string } } = $props();

	onMount(() => {
		goto(`/admin/queues/${encodeURIComponent(data.queueName)}`, { replaceState: true });
	});
</script>

<p>Redirecting...</p>
