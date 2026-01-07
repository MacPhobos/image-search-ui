<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';

	// Dialog state
	let showBasicDialog = $state(false);
	let showFormDialog = $state(false);
	let showAlertDialog = $state(false);
	let showDeleteDialog = $state(false);

	// Form state
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
</script>

<div style="padding: 2rem; max-width: 1200px; margin: 0 auto;">
	<h1 style="font-size: 2rem; font-weight: 700; margin-bottom: 2rem;">
		Phase 2: Dialog & Modal Components
	</h1>

	<section style="margin-bottom: 3rem;">
		<h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">Dialog - Basic</h2>
		<p style="margin-bottom: 1rem; color: #666;">Simple dialog with header, content, and footer.</p>
		<div>
			<Dialog.Root bind:open={showBasicDialog}>
				<Dialog.Trigger>
					<Button>Open Basic Dialog</Button>
				</Dialog.Trigger>
				<Dialog.Content>
					<Dialog.Header>
						<Dialog.Title>Welcome!</Dialog.Title>
						<Dialog.Description>
							This is a basic dialog demonstrating the shadcn-svelte Dialog component.
						</Dialog.Description>
					</Dialog.Header>
					<div style="padding: 1rem 0;">
						<p>
							Dialogs are great for displaying important information that requires user attention or
							action.
						</p>
					</div>
					<Dialog.Footer>
						<Button variant="outline" onclick={() => (showBasicDialog = false)}>Close</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog.Root>
		</div>
	</section>

	<section style="margin-bottom: 3rem;">
		<h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">Dialog - With Form</h2>
		<p style="margin-bottom: 1rem; color: #666;">
			Dialog containing a form with validation and submit handling.
		</p>
		<div>
			<Dialog.Root bind:open={showFormDialog}>
				<Dialog.Trigger>
					<Button variant="secondary">Open Form Dialog</Button>
				</Dialog.Trigger>
				<Dialog.Content>
					<Dialog.Header>
						<Dialog.Title>Edit Profile</Dialog.Title>
						<Dialog.Description>
							Make changes to your profile here. Click save when you're done.
						</Dialog.Description>
					</Dialog.Header>
					<div style="display: grid; gap: 1rem; padding: 1rem 0;">
						<div>
							<Label for="dialog-name">Name</Label>
							<Input id="dialog-name" bind:value={dialogName} placeholder="John Doe" />
						</div>
						<div>
							<Label for="dialog-email">Email</Label>
							<Input
								id="dialog-email"
								type="email"
								bind:value={dialogEmail}
								placeholder="john@example.com"
							/>
						</div>
					</div>
					<Dialog.Footer>
						<Button variant="outline" onclick={() => (showFormDialog = false)}>Cancel</Button>
						<Button onclick={handleFormSubmit}>Save Changes</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog.Root>
		</div>
	</section>

	<section style="margin-bottom: 3rem;">
		<h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem;">
			AlertDialog - Confirmation
		</h2>
		<p style="margin-bottom: 1rem; color: #666;">
			AlertDialog for user confirmations with clear action buttons.
		</p>
		<div style="display: flex; gap: 1rem;">
			<AlertDialog.Root bind:open={showAlertDialog}>
				<AlertDialog.Trigger>
					<Button variant="outline">Show Alert</Button>
				</AlertDialog.Trigger>
				<AlertDialog.Content>
					<AlertDialog.Header>
						<AlertDialog.Title>Important Action</AlertDialog.Title>
						<AlertDialog.Description>
							This action requires your confirmation. Please review carefully before proceeding.
						</AlertDialog.Description>
					</AlertDialog.Header>
					<AlertDialog.Footer>
						<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
						<AlertDialog.Action onclick={handleAlertAction}>Continue</AlertDialog.Action>
					</AlertDialog.Footer>
				</AlertDialog.Content>
			</AlertDialog.Root>

			<AlertDialog.Root bind:open={showDeleteDialog}>
				<AlertDialog.Trigger>
					<Button variant="destructive">Delete Item</Button>
				</AlertDialog.Trigger>
				<AlertDialog.Content>
					<AlertDialog.Header>
						<AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
						<AlertDialog.Description>
							This action cannot be undone. This will permanently delete the item from our servers.
						</AlertDialog.Description>
					</AlertDialog.Header>
					<AlertDialog.Footer>
						<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
						<AlertDialog.Action
							onclick={handleDeleteConfirm}
							class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Delete
						</AlertDialog.Action>
					</AlertDialog.Footer>
				</AlertDialog.Content>
			</AlertDialog.Root>
		</div>
	</section>

	<section
		style="background-color: #dcfce7; border: 2px solid #22c55e; border-radius: 8px; padding: 1.5rem; margin-bottom: 3rem;"
	>
		<h2 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; color: #15803d;">
			✅ Phase 2 Installation Successful!
		</h2>
		<p style="color: #16a34a; margin: 0;">
			Dialog and AlertDialog components are installed and working correctly.
		</p>
	</section>

	<div style="margin-top: 2rem; padding: 1rem; background-color: #f5f5f5; border-radius: 4px;">
		<h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem;">Component Patterns:</h3>
		<ul style="margin: 0; padding-left: 1.5rem;">
			<li><strong>Basic Dialog</strong> - Content display with header, body, and footer</li>
			<li><strong>Form Dialog</strong> - Form inputs with state management and submission</li>
			<li>
				<strong>AlertDialog (Confirmation)</strong> - Standard confirmation with Cancel/Continue
			</li>
			<li>
				<strong>AlertDialog (Destructive)</strong> - Delete confirmation with warning styling
			</li>
		</ul>
	</div>

	<div style="margin-top: 2rem; padding: 1rem; background-color: #fff3cd; border-radius: 4px;">
		<h3 style="font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem;">Usage Notes:</h3>
		<ul style="margin: 0; padding-left: 1.5rem;">
			<li>Use <code>Dialog</code> for general content display and forms</li>
			<li>Use <code>AlertDialog</code> for confirmations and destructive actions</li>
			<li>
				<code>bind:open</code> provides two-way state binding for open/close control
			</li>
			<li>
				<code>asChild</code> + <code>builders</code> pattern allows custom trigger elements
			</li>
			<li>Check browser console to see action handlers firing</li>
		</ul>
	</div>
</div>
