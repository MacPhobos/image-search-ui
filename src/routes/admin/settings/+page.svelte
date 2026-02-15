<script lang="ts">
	import { onMount } from 'svelte';
	import { setViewId } from '$lib/dev/viewId';
	import { registerComponent } from '$lib/dev/componentRegistry.svelte';
	import FaceMatchingSettings from '$lib/components/admin/FaceMatchingSettings.svelte';

	// Component tracking (DEV only)
	const cleanup = registerComponent('routes/admin/settings/+page', {
		filePath: 'src/routes/admin/settings/+page.svelte'
	});

	// DEV: Set view ID for DevOverlay breadcrumb and component cleanup
	onMount(() => {
		if (import.meta.env.DEV) {
			const clearViewId = setViewId('page:/admin/settings');
			return () => {
				cleanup();
				clearViewId?.();
			};
		}
		return cleanup;
	});
</script>

<FaceMatchingSettings />
