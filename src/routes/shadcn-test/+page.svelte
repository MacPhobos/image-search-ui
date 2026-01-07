<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';

	let searchQuery = $state('');
	let emailInput = $state('');
	let passwordInput = $state('');
	let numberInput = $state('');
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

	<section style="margin-bottom: 3rem;">
		<h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">Badge Variants</h2>
		<div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
			<Badge>Default</Badge>
			<Badge variant="secondary">Secondary</Badge>
			<Badge variant="destructive">Destructive</Badge>
			<Badge variant="outline">Outline</Badge>
		</div>
	</section>

	<section style="margin-bottom: 3rem;">
		<h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">Input Variants</h2>
		<div style="display: grid; gap: 1.5rem; max-width: 600px;">
			<div>
				<Label for="default-input">Default Input</Label>
				<Input id="default-input" placeholder="Type something..." bind:value={searchQuery} />
			</div>

			<div>
				<Label for="email-input">Email Input</Label>
				<Input
					id="email-input"
					type="email"
					placeholder="email@example.com"
					bind:value={emailInput}
				/>
			</div>

			<div>
				<Label for="password-input">Password Input</Label>
				<Input id="password-input" type="password" bind:value={passwordInput} />
			</div>

			<div>
				<Label for="number-input">Number Input</Label>
				<Input id="number-input" type="number" placeholder="0" bind:value={numberInput} />
			</div>

			<div>
				<Label for="disabled-input">Disabled Input</Label>
				<Input id="disabled-input" disabled value="Cannot edit this" />
			</div>

			<div>
				<Label for="required-input">
					Required Input <span style="color: red;">*</span>
				</Label>
				<Input id="required-input" required placeholder="This field is required" />
			</div>
		</div>
	</section>

	<section style="margin-bottom: 3rem;">
		<h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">Label Variants</h2>
		<div style="display: grid; gap: 1rem; max-width: 600px;">
			<div>
				<Label>Basic Label (no for attribute)</Label>
			</div>
			<div>
				<Label for="labeled-input">Label with for attribute</Label>
				<Input id="labeled-input" placeholder="Click the label above to focus" />
			</div>
			<div>
				<Label for="required-field">
					Required Field <span style="color: red;">*</span>
				</Label>
				<Input id="required-field" placeholder="Must be filled out" />
			</div>
		</div>
	</section>

	<section style="margin-bottom: 3rem;">
		<h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">Alert Variants</h2>
		<div style="display: grid; gap: 1rem; max-width: 800px;">
			<Alert>
				<AlertTitle>Default Alert</AlertTitle>
				<AlertDescription>
					This is a default alert with a title and description.
				</AlertDescription>
			</Alert>

			<Alert variant="destructive">
				<AlertTitle>Destructive Alert</AlertTitle>
				<AlertDescription>
					This is an error alert. Something went wrong!
				</AlertDescription>
			</Alert>

			<Alert>
				<AlertDescription>Alert with description only (no title)</AlertDescription>
			</Alert>
		</div>
	</section>

	<section
		style="background-color: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 8px; padding: 1.5rem; margin-top: 3rem;"
	>
		<h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; color: #0369a1;">
			✅ Phase 1 Installation Successful!
		</h2>
		<p style="color: #075985; margin: 0;">
			All Phase 1 components (Button, Badge, Input, Label, Alert) are now installed and working.
		</p>
	</section>

	<div style="margin-top: 2rem; padding: 1rem; background-color: #f5f5f5; border-radius: 4px;">
		<h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem;">Next Steps:</h3>
		<ul style="margin: 0; padding-left: 1.5rem;">
			<li>Verify no console errors in browser DevTools</li>
			<li>Test interactive states (hover, focus, disabled)</li>
			<li>Confirm TypeScript has no errors (<code>make typecheck</code>)</li>
			<li>Run tests to ensure no regressions (<code>make test</code>)</li>
			<li>Begin migrating existing components to use these UI primitives</li>
		</ul>
	</div>
</div>
