<script lang="ts">
	import { Button } from '$lib/components/ui/button';
</script>

<div style="padding: 2rem; max-width: 1200px; margin: 0 auto;">
	<h1 style="font-size: 2rem; font-weight: 700; margin-bottom: 2rem;">
		shadcn-svelte Installation Test
	</h1>

	<section style="margin-bottom: 3rem;">
		<h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">Button Variants</h2>
		<div style="display: flex; gap: 1rem; flex-wrap: wrap;">
			<Button>Default</Button>
			<Button variant="secondary">Secondary</Button>
			<Button variant="destructive">Destructive</Button>
			<Button variant="outline">Outline</Button>
			<Button variant="ghost">Ghost</Button>
			<Button variant="link">Link</Button>
		</div>
	</section>

	<section style="margin-bottom: 3rem;">
		<h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">Button Sizes</h2>
		<div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
			<Button size="sm">Small</Button>
			<Button size="default">Default</Button>
			<Button size="lg">Large</Button>
			<Button size="icon">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
				>
					<path d="M5 12h14" />
					<path d="m12 5 7 7-7 7" />
				</svg>
			</Button>
		</div>
	</section>

	<section style="margin-bottom: 3rem;">
		<h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">Button States</h2>
		<div style="display: flex; gap: 1rem; flex-wrap: wrap;">
			<Button>Enabled</Button>
			<Button disabled>Disabled</Button>
		</div>
	</section>

	<section style="margin-bottom: 3rem;">
		<h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">Combined Variations</h2>
		<div
			style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem;"
		>
			<Button variant="default" size="sm">Small Default</Button>
			<Button variant="secondary" size="lg">Large Secondary</Button>
			<Button variant="destructive" size="sm">Small Destructive</Button>
			<Button variant="outline" size="lg">Large Outline</Button>
			<Button variant="ghost">Ghost Default</Button>
			<Button variant="link" size="sm">Small Link</Button>
		</div>
	</section>

	<section
		style="background-color: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 8px; padding: 1.5rem; margin-top: 3rem;"
	>
		<h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; color: #0369a1;">
			✅ Installation Successful!
		</h2>
		<p style="color: #075985; margin: 0;">
			If you can see styled buttons above, shadcn-svelte has been successfully installed and
			configured for Svelte 5 + Tailwind CSS v4.
		</p>
	</section>

	<div style="margin-top: 2rem; padding: 1rem; background-color: #f5f5f5; border-radius: 4px;">
		<h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem;">Next Steps:</h3>
		<ul style="margin: 0; padding-left: 1.5rem;">
			<li>Verify no console errors in browser DevTools</li>
			<li>Test hover and focus states on buttons</li>
			<li>Confirm TypeScript has no errors (<code>make typecheck</code>)</li>
			<li>Run tests to ensure no regressions (<code>make test</code>)</li>
			<li>Proceed to Phase 1 migration (Badge, Input, Alert components)</li>
		</ul>
	</div>
</div>
