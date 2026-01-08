<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
	import * as Select from '$lib/components/ui/select';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Switch } from '$lib/components/ui/switch';
	import { Separator } from '$lib/components/ui/separator';
	import * as Table from '$lib/components/ui/table';
	// Phase 6: Advanced UI Components
	import { toast } from 'svelte-sonner';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { Progress } from '$lib/components/ui/progress';
	// Phase 2: Dialog Components
	import * as Dialog from '$lib/components/ui/dialog';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	// Phase 5: Card, Tabs, Avatar
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Avatar from '$lib/components/ui/avatar';

	let searchQuery = $state('');
	let emailInput = $state('');
	let passwordInput = $state('');
	let numberInput = $state('');

	// Phase 3: Form Controls State (bits-ui v2 uses simple strings)
	let selectedFruit = $state<string | undefined>(undefined);
	let selectedSort = $state<string | undefined>(undefined);

	// Derived labels for Select triggers
	let fruitLabel = $derived(
		selectedFruit === 'apple' ? '🍎 Apple' :
		selectedFruit === 'banana' ? '🍌 Banana' :
		selectedFruit === 'orange' ? '🍊 Orange' :
		selectedFruit === 'grape' ? '🍇 Grape' :
		selectedFruit === 'strawberry' ? '🍓 Strawberry' :
		'Choose your favorite fruit'
	);
	let sortLabel = $derived(
		selectedSort === 'date_desc' ? 'Newest First' :
		selectedSort === 'date_asc' ? 'Oldest First' :
		selectedSort === 'name_asc' ? 'Name (A-Z)' :
		selectedSort === 'name_desc' ? 'Name (Z-A)' :
		selectedSort === 'size_desc' ? 'Largest First' :
		selectedSort === 'size_asc' ? 'Smallest First' :
		'Select sort order'
	);
	let termsAccepted = $state(false);
	let newsletterSubscribed = $state(false);
	let notificationsEnabled = $state(true);
	let darkModeEnabled = $state(false);
	let selectedCategories = $state({
		sports: false,
		music: true,
		travel: false,
		food: true
	});

	// Phase 4: Table Data
	const users = [
		{ id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'active' },
		{ id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User', status: 'active' },
		{ id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'User', status: 'inactive' },
		{ id: 4, name: 'Alice Williams', email: 'alice@example.com', role: 'Editor', status: 'active' },
		{ id: 5, name: 'Charlie Brown', email: 'charlie@example.com', role: 'User', status: 'active' }
	];

	const metrics = [
		{ metric: 'Total Users', value: '1,234', change: '+12%', trend: 'up' },
		{ metric: 'Active Sessions', value: '892', change: '+8%', trend: 'up' },
		{ metric: 'Error Rate', value: '0.3%', change: '-0.1%', trend: 'down' },
		{ metric: 'Avg. Response Time', value: '142ms', change: '+5ms', trend: 'up' }
	];

	function handleEdit(id: number) {
		console.log('Edit user:', id);
	}

	function handleDelete(id: number) {
		console.log('Delete user:', id);
	}

	// Phase 2: Dialog State
	let showBasicDialog = $state(false);
	let showFormDialog = $state(false);
	let showAlertDialog = $state(false);
	let showDeleteDialog = $state(false);
	let dialogName = $state('');
	let dialogEmail = $state('');

	function handleFormSubmit() {
		console.log('Form submitted:', { name: dialogName, email: dialogEmail });
		showFormDialog = false;
		dialogName = '';
		dialogEmail = '';
	}

	function handleDeleteConfirm() {
		console.log('Item deleted!');
		showDeleteDialog = false;
	}

	function handleAlertAction() {
		console.log('Alert action confirmed!');
		showAlertDialog = false;
	}

	// Phase 5: Card, Tabs, Avatar Data
	let selectedTab = $state('overview');

	const teamMembers = [
		{
			id: 1,
			name: 'Sarah Johnson',
			role: 'Senior Engineer',
			email: 'sarah.j@company.com',
			avatar: 'https://i.pravatar.cc/150?img=1',
			initials: 'SJ'
		},
		{
			id: 2,
			name: 'Michael Chen',
			role: 'Product Manager',
			email: 'michael.c@company.com',
			avatar: 'https://i.pravatar.cc/150?img=2',
			initials: 'MC'
		},
		{
			id: 3,
			name: 'Emily Rodriguez',
			role: 'UX Designer',
			email: 'emily.r@company.com',
			avatar: 'https://i.pravatar.cc/150?img=3',
			initials: 'ER'
		},
		{
			id: 4,
			name: 'David Kim',
			role: 'Tech Lead',
			email: 'david.k@company.com',
			avatar: '', // Test fallback
			initials: 'DK'
		}
	];

	const projects = [
		{
			id: 1,
			title: 'E-Commerce Platform',
			description: 'Building a modern shopping experience',
			status: 'active',
			progress: 75,
			dueDate: '2026-02-15'
		},
		{
			id: 2,
			title: 'Mobile App Redesign',
			description: 'Refreshing the mobile user interface',
			status: 'planning',
			progress: 30,
			dueDate: '2026-03-01'
		},
		{
			id: 3,
			title: 'API Migration',
			description: 'Moving to GraphQL from REST',
			status: 'completed',
			progress: 100,
			dueDate: '2026-01-10'
		}
	];

	// Phase 6: Progress state
	let progressValue = $state(0);

	// Simulate progress increment
	function startProgress() {
		progressValue = 0;
		const interval = setInterval(() => {
			progressValue += 10;
			if (progressValue >= 100) {
				clearInterval(interval);
				toast.success('Progress completed!');
			}
		}, 500);
	}
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
		<!-- Phase 3 Components -->
		<h2 style="font-size: 1.75rem; font-weight: 700; margin-bottom: 1.5rem;">
			Phase 3: Form Controls
		</h2>

		<section style="margin-bottom: 3rem;">
			<h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">Select Dropdown</h2>
			<div style="display: grid; gap: 2rem; max-width: 600px;">
				<!-- Basic Select -->
				<div>
					<Label for="fruit-select">Select a Fruit</Label>
					<Select.Root type="single" bind:value={selectedFruit}>
						<Select.Trigger id="fruit-select" class="w-[280px]">
							{fruitLabel}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="apple" label="Apple">🍎 Apple</Select.Item>
							<Select.Item value="banana" label="Banana">🍌 Banana</Select.Item>
							<Select.Item value="orange" label="Orange">🍊 Orange</Select.Item>
							<Select.Item value="grape" label="Grape">🍇 Grape</Select.Item>
							<Select.Item value="strawberry" label="Strawberry">🍓 Strawberry</Select.Item>
						</Select.Content>
					</Select.Root>
					{#if selectedFruit}
						<p style="margin-top: 0.5rem; color: #6b7280;">
							Selected: {fruitLabel}
						</p>
					{/if}
				</div>

				<!-- Sort By Select (Filter Pattern) -->
				<div>
					<Label for="sort-select">Sort By</Label>
					<Select.Root type="single" bind:value={selectedSort}>
						<Select.Trigger id="sort-select" class="w-[280px]">
							{sortLabel}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="date_desc" label="Newest First">Newest First</Select.Item>
							<Select.Item value="date_asc" label="Oldest First">Oldest First</Select.Item>
							<Select.Item value="name_asc" label="Name (A-Z)">Name (A-Z)</Select.Item>
							<Select.Item value="name_desc" label="Name (Z-A)">Name (Z-A)</Select.Item>
							<Select.Item value="size_desc" label="Largest First">Largest First</Select.Item>
							<Select.Item value="size_asc" label="Smallest First">Smallest First</Select.Item>
						</Select.Content>
					</Select.Root>
					{#if selectedSort}
						<p style="margin-top: 0.5rem; color: #6b7280;">Sort: {sortLabel}</p>
					{/if}
				</div>
			</div>
		</section>

		<section style="margin-bottom: 3rem;">
			<h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">Checkbox</h2>
			<div style="display: grid; gap: 1.5rem; max-width: 600px;">
				<!-- Single Checkbox -->
				<div class="flex items-center space-x-2">
					<Checkbox id="terms" bind:checked={termsAccepted} />
					<Label for="terms" class="cursor-pointer">
						Accept terms and conditions
						{#if termsAccepted}
							<Badge variant="outline" class="ml-2">✓</Badge>
						{/if}
					</Label>
				</div>

				<div class="flex items-center space-x-2">
					<Checkbox id="newsletter" bind:checked={newsletterSubscribed} />
					<Label for="newsletter" class="cursor-pointer">
						Subscribe to newsletter
						{#if newsletterSubscribed}
							<Badge variant="outline" class="ml-2">✓</Badge>
						{/if}
					</Label>
				</div>

				<Separator />

				<!-- Checkbox Group -->
				<div>
					<Label class="mb-2 block">Select Categories</Label>
					<div style="display: grid; gap: 1rem;">
						<div class="flex items-center space-x-2">
							<Checkbox id="cat-sports" bind:checked={selectedCategories.sports} />
							<Label for="cat-sports" class="cursor-pointer">Sports</Label>
						</div>
						<div class="flex items-center space-x-2">
							<Checkbox id="cat-music" bind:checked={selectedCategories.music} />
							<Label for="cat-music" class="cursor-pointer">Music</Label>
						</div>
						<div class="flex items-center space-x-2">
							<Checkbox id="cat-travel" bind:checked={selectedCategories.travel} />
							<Label for="cat-travel" class="cursor-pointer">Travel</Label>
						</div>
						<div class="flex items-center space-x-2">
							<Checkbox id="cat-food" bind:checked={selectedCategories.food} />
							<Label for="cat-food" class="cursor-pointer">Food & Dining</Label>
						</div>
					</div>
					<p style="margin-top: 1rem; color: #6b7280;">
						Selected: {Object.entries(selectedCategories)
							.filter(([_, checked]) => checked)
							.map(([name]) => name.charAt(0).toUpperCase() + name.slice(1))
							.join(', ') || 'None'}
					</p>
				</div>
			</div>
		</section>

		<section style="margin-bottom: 3rem;">
			<h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">Switch Toggle</h2>
			<div style="display: grid; gap: 1.5rem; max-width: 600px;">
				<div class="flex items-center justify-between rounded-lg border p-4">
					<div class="space-y-0.5">
						<Label for="notifications" class="cursor-pointer">Enable Notifications</Label>
						<p style="font-size: 0.875rem; color: #6b7280;">
							Receive notifications about new updates
						</p>
					</div>
					<Switch id="notifications" bind:checked={notificationsEnabled} />
				</div>

				<div class="flex items-center justify-between rounded-lg border p-4">
					<div class="space-y-0.5">
						<Label for="dark-mode" class="cursor-pointer">Dark Mode</Label>
						<p style="font-size: 0.875rem; color: #6b7280;">Toggle dark mode theme</p>
					</div>
					<Switch id="dark-mode" bind:checked={darkModeEnabled} />
				</div>

				<Alert>
					<AlertTitle>Current Settings</AlertTitle>
					<AlertDescription>
						Notifications: <strong>{notificationsEnabled ? 'On' : 'Off'}</strong><br />
						Dark Mode: <strong>{darkModeEnabled ? 'Enabled' : 'Disabled'}</strong>
					</AlertDescription>
				</Alert>
			</div>
		</section>

		<section style="margin-bottom: 3rem;">
			<h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">Separator</h2>
			<div style="max-width: 600px;">
				<p>Content above separator</p>
				<Separator class="my-4" />
				<p>Content below separator</p>
				<Separator class="my-4" />
				<div style="display: flex; align-items: center; gap: 1rem;">
					<span>Inline content</span>
					<Separator orientation="vertical" class="h-6" />
					<span>Separated content</span>
					<Separator orientation="vertical" class="h-6" />
					<span>More content</span>
				</div>
			</div>
		</section>

		<Separator class="my-8" />
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
				<!-- PHASE 6: Toast, Skeleton, Tooltip, Progress -->
				<Separator />
				<section style="margin-top: 3rem; margin-bottom: 3rem;">
					<h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">
						Toast Notifications (Sonner)
					</h2>
					<div style="display: flex; gap: 1rem; flex-wrap: wrap;">
						<Button onclick={() => toast.success('Operation successful!')}>Success Toast</Button>
						<Button variant="destructive" onclick={() => toast.error('Something went wrong!')}>
							Error Toast
						</Button>
						<Button variant="secondary" onclick={() => toast.info('Here is some information')}>
							Info Toast
						</Button>
						<Button
							variant="outline"
							onclick={() => toast.loading('Loading...', { duration: 2000 })}
						>
							Loading Toast
						</Button>
						<Button
							variant="ghost"
							onclick={() =>
								toast('Custom Toast', {
									description: 'This is a custom toast with a description',
									action: {
										label: 'Undo',
										onClick: () => toast.info('Undo clicked!')
									}
								})}
						>
							Custom with Action
						</Button>
					</div>
				</section>

				<section style="margin-bottom: 3rem;">
					<h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">
						Skeleton Loading
					</h2>
					<div style="display: grid; gap: 2rem;">
						<div>
							<h3 style="font-size: 1.125rem; font-weight: 500; margin-bottom: 0.5rem;">
								Text Loading
							</h3>
							<div style="display: flex; flex-direction: column; gap: 0.5rem;">
								<Skeleton class="h-4 w-full" />
								<Skeleton class="h-4 w-[90%]" />
								<Skeleton class="h-4 w-[80%]" />
							</div>
						</div>

						<div>
							<h3 style="font-size: 1.125rem; font-weight: 500; margin-bottom: 0.5rem;">
								Card Loading
							</h3>
							<div
								style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; display: flex; gap: 1rem;"
							>
								<Skeleton class="h-12 w-12 rounded-full" />
								<div style="flex: 1; display: flex; flex-direction: column; gap: 0.5rem;">
									<Skeleton class="h-4 w-[250px]" />
									<Skeleton class="h-4 w-[200px]" />
								</div>
							</div>
						</div>

						<div>
							<h3 style="font-size: 1.125rem; font-weight: 500; margin-bottom: 0.5rem;">
								Image Gallery Loading
							</h3>
							<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem;">
								<Skeleton class="h-32 w-full" />
								<Skeleton class="h-32 w-full" />
								<Skeleton class="h-32 w-full" />
								<Skeleton class="h-32 w-full" />
							</div>
						</div>
					</div>
				</section>

				<section style="margin-bottom: 3rem;">
					<h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">Tooltips</h2>
					<div style="display: flex; gap: 2rem; flex-wrap: wrap; align-items: center;">
						<Tooltip.Root>
							<Tooltip.Trigger asChild let:builder>
								<Button builders={[builder]} variant="outline">Hover me</Button>
							</Tooltip.Trigger>
							<Tooltip.Content>
								<p>This is a tooltip</p>
							</Tooltip.Content>
						</Tooltip.Root>

						<Tooltip.Root>
							<Tooltip.Trigger asChild let:builder>
								<Button builders={[builder]}>With delay</Button>
							</Tooltip.Trigger>
							<Tooltip.Content>
								<p>Tooltip with default delay</p>
							</Tooltip.Content>
						</Tooltip.Root>

						<Tooltip.Root>
							<Tooltip.Trigger asChild let:builder>
								<Badge builders={[builder]} variant="secondary">Badge with tooltip</Badge>
							</Tooltip.Trigger>
							<Tooltip.Content>
								<p>You can add tooltips to any element</p>
							</Tooltip.Content>
						</Tooltip.Root>

						<Tooltip.Root>
							<Tooltip.Trigger asChild let:builder>
								<span
									use:builder.action
									{...builder}
									style="cursor: help; text-decoration: underline; text-decoration-style: dotted;"
								>
									Help text
								</span>
							</Tooltip.Trigger>
							<Tooltip.Content>
								<p>Tooltips are great for providing additional context</p>
							</Tooltip.Content>
						</Tooltip.Root>
					</div>
				</section>

				<section style="margin-bottom: 3rem;">
					<h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">Progress Bars</h2>
					<div style="display: grid; gap: 2rem; max-width: 600px;">
						<div>
							<div
								style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;"
							>
								<Label>Static Progress (33%)</Label>
								<span style="font-size: 0.875rem; color: #6b7280;">33%</span>
							</div>
							<Progress value={33} />
						</div>

						<div>
							<div
								style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;"
							>
								<Label>Static Progress (66%)</Label>
								<span style="font-size: 0.875rem; color: #6b7280;">66%</span>
							</div>
							<Progress value={66} />
						</div>

						<div>
							<div
								style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;"
							>
								<Label>Dynamic Progress ({progressValue}%)</Label>
								<span style="font-size: 0.875rem; color: #6b7280;">{progressValue}%</span>
							</div>
							<Progress value={progressValue} />
							<div style="margin-top: 0.5rem;">
								<Button size="sm" onclick={startProgress}>Start Progress</Button>
								<Button
									size="sm"
									variant="outline"
									onclick={() => {
										progressValue = 0;
									}}
								>
									Reset
								</Button>
							</div>
						</div>

						<div>
							<div style="margin-bottom: 0.5rem;">
								<Label>Indeterminate (Unknown Progress)</Label>
							</div>
							<Progress value={null} />
							<p style="font-size: 0.875rem; color: #6b7280; margin-top: 0.5rem;">
								Use <code>value={'{null}'}</code> for unknown progress states
							</p>
						</div>
					</div>
				</section>
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
				<AlertDescription>This is a default alert with a title and description.</AlertDescription>
			</Alert>

			<Alert variant="destructive">
				<AlertTitle>Destructive Alert</AlertTitle>
				<AlertDescription>This is an error alert. Something went wrong!</AlertDescription>
			</Alert>

			<Alert>
				<AlertDescription>Alert with description only (no title)</AlertDescription>
			</Alert>
		</div>
	</section>

	<Separator class="my-8" />

	<h2 style="font-size: 1.75rem; font-weight: 700; margin-bottom: 1.5rem;">Phase 4: Tables</h2>

	<section style="margin-bottom: 3rem;">
		<h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">Basic Table</h2>
		<div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Name</Table.Head>
						<Table.Head>Email</Table.Head>
						<Table.Head>Role</Table.Head>
						<Table.Head>Status</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each users as user}
						<Table.Row>
							<Table.Cell class="font-medium">{user.name}</Table.Cell>
							<Table.Cell>{user.email}</Table.Cell>
							<Table.Cell>{user.role}</Table.Cell>
							<Table.Cell>
								<Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
									{user.status}
								</Badge>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	</section>

	<section style="margin-bottom: 3rem;">
		<h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">Table with Alignment</h2>
		<div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Metric</Table.Head>
						<Table.Head class="text-right">Value</Table.Head>
						<Table.Head class="text-right">Change</Table.Head>
						<Table.Head class="text-center">Trend</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each metrics as metric}
						<Table.Row>
							<Table.Cell class="font-medium">{metric.metric}</Table.Cell>
							<Table.Cell class="text-right font-mono">{metric.value}</Table.Cell>
							<Table.Cell class="text-right">
								<span
									style="color: {metric.trend === 'up'
										? metric.metric.includes('Error')
											? '#dc2626'
											: '#16a34a'
										: metric.metric.includes('Error')
											? '#16a34a'
											: '#dc2626'};"
								>
									{metric.change}
								</span>
							</Table.Cell>
							<Table.Cell class="text-center">
								{#if metric.trend === 'up'}
									<span style="color: {metric.metric.includes('Error') ? '#dc2626' : '#16a34a'};">
										↑
									</span>
								{:else}
									<span style="color: {metric.metric.includes('Error') ? '#16a34a' : '#dc2626'};">
										↓
									</span>
								{/if}
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	</section>

	<section style="margin-bottom: 3rem;">
		<h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">Table with Actions</h2>
		<div style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>ID</Table.Head>
						<Table.Head>Name</Table.Head>
						<Table.Head>Email</Table.Head>
						<Table.Head class="text-right">Actions</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each users as user}
						<Table.Row>
							<Table.Cell class="font-mono text-sm text-muted-foreground">
								#{user.id}
							</Table.Cell>
							<Table.Cell class="font-medium">{user.name}</Table.Cell>
							<Table.Cell>{user.email}</Table.Cell>
							<Table.Cell class="text-right">
								<div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
									<Button variant="ghost" size="sm" onclick={() => handleEdit(user.id)}>
										Edit
									</Button>
									<Button variant="ghost" size="sm" onclick={() => handleDelete(user.id)}>
										Delete
									</Button>
								</div>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	</section>

	<!-- Phase 5: Card, Tabs, Avatar -->
	<h2
		style="font-size: 1.75rem; font-weight: 700; margin-top: 4rem; margin-bottom: 2rem; padding-bottom: 0.5rem; border-bottom: 2px solid #e5e7eb;"
	>
		Phase 5: Cards, Tabs, and Avatars
	</h2>

	<section style="margin-bottom: 3rem;">
		<h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">Basic Card</h2>
		<Card.Root style="max-width: 600px;">
			<Card.Header>
				<Card.Title>Project Overview</Card.Title>
				<Card.Description>View and manage your project details</Card.Description>
			</Card.Header>
			<Card.Content>
				<p style="color: #6b7280;">
					This is a basic card component with header, content, and footer sections. Cards are
					perfect for organizing related information and actions.
				</p>
			</Card.Content>
			<Card.Footer style="display: flex; gap: 1rem; justify-content: flex-end;">
				<Button variant="outline">Cancel</Button>
				<Button>Save Changes</Button>
			</Card.Footer>
		</Card.Root>
	</section>

	<section style="margin-bottom: 3rem;">
		<h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">Project Cards</h2>
		<div
			style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;"
		>
			{#each projects as project}
				<Card.Root>
					<Card.Header>
						<div style="display: flex; justify-content: space-between; align-items: start;">
							<Card.Title>{project.title}</Card.Title>
							<Badge
								variant={project.status === 'completed'
									? 'default'
									: project.status === 'active'
										? 'secondary'
										: 'outline'}
							>
								{project.status}
							</Badge>
						</div>
						<Card.Description>{project.description}</Card.Description>
					</Card.Header>
					<Card.Content>
						<div style="margin-bottom: 0.5rem;">
							<Label>Progress: {project.progress}%</Label>
						</div>
						<Progress value={project.progress} />
						<p style="color: #9ca3af; font-size: 0.875rem; margin-top: 1rem;">
							Due: {project.dueDate}
						</p>
					</Card.Content>
					<Card.Footer>
						<Button variant="ghost" size="sm" style="width: 100%;">View Details</Button>
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>
	</section>

	<section style="margin-bottom: 3rem;">
		<h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">Avatar Variants</h2>
		<div style="display: flex; gap: 2rem; flex-wrap: wrap; align-items: center;">
			<!-- Avatar with image -->
			<div style="text-align: center;">
				<Avatar.Root>
					<Avatar.Image src="https://i.pravatar.cc/150?img=5" alt="User Avatar" />
					<Avatar.Fallback>UA</Avatar.Fallback>
				</Avatar.Root>
				<p style="margin-top: 0.5rem; font-size: 0.875rem; color: #6b7280;">With Image</p>
			</div>

			<!-- Avatar with fallback -->
			<div style="text-align: center;">
				<Avatar.Root>
					<Avatar.Image src="" alt="No Image" />
					<Avatar.Fallback>JD</Avatar.Fallback>
				</Avatar.Root>
				<p style="margin-top: 0.5rem; font-size: 0.875rem; color: #6b7280;">Fallback Only</p>
			</div>

			<!-- Avatar sizes -->
			<div style="display: flex; gap: 1rem; align-items: center;">
				<Avatar.Root class="h-8 w-8">
					<Avatar.Image src="https://i.pravatar.cc/150?img=6" alt="Small" />
					<Avatar.Fallback>SM</Avatar.Fallback>
				</Avatar.Root>
				<Avatar.Root class="h-10 w-10">
					<Avatar.Image src="https://i.pravatar.cc/150?img=7" alt="Default" />
					<Avatar.Fallback>MD</Avatar.Fallback>
				</Avatar.Root>
				<Avatar.Root class="h-16 w-16">
					<Avatar.Image src="https://i.pravatar.cc/150?img=8" alt="Large" />
					<Avatar.Fallback>LG</Avatar.Fallback>
				</Avatar.Root>
			</div>
		</div>
	</section>

	<section style="margin-bottom: 3rem;">
		<h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">
			Team Members (Card + Avatar)
		</h2>
		<div
			style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem;"
		>
			{#each teamMembers as member}
				<Card.Root>
					<Card.Header>
						<div style="display: flex; align-items: center; gap: 1rem;">
							<Avatar.Root>
								<Avatar.Image src={member.avatar} alt={member.name} />
								<Avatar.Fallback>{member.initials}</Avatar.Fallback>
							</Avatar.Root>
							<div>
								<Card.Title style="font-size: 1rem;">{member.name}</Card.Title>
								<Card.Description style="font-size: 0.875rem;">{member.role}</Card.Description>
							</div>
						</div>
					</Card.Header>
					<Card.Content>
						<p style="color: #6b7280; font-size: 0.875rem;">{member.email}</p>
					</Card.Content>
					<Card.Footer>
						<Button variant="outline" size="sm" style="width: 100%;">View Profile</Button>
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>
	</section>

	<section style="margin-bottom: 3rem;">
		<h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">Tabs Component</h2>
		<Tabs.Root bind:value={selectedTab} class="w-full">
			<Tabs.List>
				<Tabs.Trigger value="overview">Overview</Tabs.Trigger>
				<Tabs.Trigger value="analytics">Analytics</Tabs.Trigger>
				<Tabs.Trigger value="settings">Settings</Tabs.Trigger>
				<Tabs.Trigger value="team">Team</Tabs.Trigger>
			</Tabs.List>

			<Tabs.Content value="overview">
				<Card.Root>
					<Card.Header>
						<Card.Title>Project Overview</Card.Title>
						<Card.Description>
							Get a high-level view of your project status and progress
						</Card.Description>
					</Card.Header>
					<Card.Content>
						<div style="display: grid; gap: 1rem;">
							<div>
								<Label>Total Tasks</Label>
								<p style="font-size: 2rem; font-weight: 700; margin-top: 0.25rem;">48</p>
							</div>
							<Separator />
							<div>
								<Label>Completed</Label>
								<p style="font-size: 2rem; font-weight: 700; margin-top: 0.25rem;">32</p>
							</div>
							<Separator />
							<div>
								<Label>In Progress</Label>
								<p style="font-size: 2rem; font-weight: 700; margin-top: 0.25rem;">12</p>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			</Tabs.Content>

			<Tabs.Content value="analytics">
				<Card.Root>
					<Card.Header>
						<Card.Title>Analytics Dashboard</Card.Title>
						<Card.Description>Track your project metrics and KPIs</Card.Description>
					</Card.Header>
					<Card.Content>
						<div style="display: grid; gap: 1rem;">
							{#each metrics as metric}
								<div>
									<div style="display: flex; justify-content: space-between; align-items: center;">
										<Label>{metric.metric}</Label>
										<Badge variant={metric.trend === 'up' ? 'default' : 'secondary'}>
											{metric.change}
										</Badge>
									</div>
									<p style="font-size: 1.5rem; font-weight: 600; margin-top: 0.5rem;">
										{metric.value}
									</p>
								</div>
								<Separator />
							{/each}
						</div>
					</Card.Content>
				</Card.Root>
			</Tabs.Content>

			<Tabs.Content value="settings">
				<Card.Root>
					<Card.Header>
						<Card.Title>Project Settings</Card.Title>
						<Card.Description>Manage your project configuration and preferences</Card.Description>
					</Card.Header>
					<Card.Content>
						<div style="display: grid; gap: 1.5rem;">
							<div>
								<Label for="project-name">Project Name</Label>
								<Input id="project-name" value="Image Search UI" />
							</div>
							<div>
								<Label for="project-description">Description</Label>
								<Input id="project-description" placeholder="Enter project description" />
							</div>
							<div style="display: flex; align-items: center; gap: 2rem;">
								<div style="display: flex; align-items: center; gap: 0.5rem;">
									<Switch id="tab-notifications" />
									<Label for="tab-notifications">Enable notifications</Label>
								</div>
								<div style="display: flex; align-items: center; gap: 0.5rem;">
									<Switch id="tab-public" />
									<Label for="tab-public">Make public</Label>
								</div>
							</div>
						</div>
					</Card.Content>
					<Card.Footer style="display: flex; gap: 1rem; justify-content: flex-end;">
						<Button variant="outline">Cancel</Button>
						<Button>Save Changes</Button>
					</Card.Footer>
				</Card.Root>
			</Tabs.Content>

			<Tabs.Content value="team">
				<Card.Root>
					<Card.Header>
						<Card.Title>Team Members</Card.Title>
						<Card.Description>Manage your team and permissions</Card.Description>
					</Card.Header>
					<Card.Content>
						<div style="display: grid; gap: 1rem;">
							{#each teamMembers.slice(0, 3) as member}
								<div style="display: flex; justify-content: space-between; align-items: center;">
									<div style="display: flex; align-items: center; gap: 1rem;">
										<Avatar.Root>
											<Avatar.Image src={member.avatar} alt={member.name} />
											<Avatar.Fallback>{member.initials}</Avatar.Fallback>
										</Avatar.Root>
										<div>
											<p style="font-weight: 500;">{member.name}</p>
											<p style="font-size: 0.875rem; color: #6b7280;">{member.role}</p>
										</div>
									</div>
									<Button variant="outline" size="sm">Manage</Button>
								</div>
								<Separator />
							{/each}
							<Button variant="outline" style="width: 100%;">Add Team Member</Button>
						</div>
					</Card.Content>
				</Card.Root>
			</Tabs.Content>
		</Tabs.Root>
	</section>

	<section
		style="background-color: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 8px; padding: 1.5rem; margin-top: 3rem;"
	>
		<h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; color: #0369a1;">
			✅ Phase 1-6 Installation Successful!
		</h2>
		<p style="color: #075985; margin: 0;">
			All Phase 1-6 components are now installed and working (Button, Badge, Input, Label, Alert,
			Select, Checkbox, Switch, Separator, Table, Card, Tabs, Avatar, Toast/Sonner, Skeleton,
			Tooltip, Progress).
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
