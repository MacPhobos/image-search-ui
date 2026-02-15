<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	onMount(() => goto('/admin/vectors', { replaceState: true }));
</script>

<p>Redirecting to admin vectors...</p>
