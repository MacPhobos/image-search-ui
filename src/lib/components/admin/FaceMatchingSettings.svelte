<script lang="ts">
	import { onMount } from 'svelte';

	interface FaceMatchingConfig {
		autoAssignThreshold: number;
		suggestionThreshold: number;
		maxSuggestions: number;
		suggestionExpiryDays: number;
		prototypeMinQuality: number;
		prototypeMaxExemplars: number;
	}

	const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

	let config = $state<FaceMatchingConfig>({
		autoAssignThreshold: 0.85,
		suggestionThreshold: 0.7,
		maxSuggestions: 50,
		suggestionExpiryDays: 30,
		prototypeMinQuality: 0.5,
		prototypeMaxExemplars: 5
	});

	let loading = $state(false);
	let saving = $state(false);
	let error = $state<string | null>(null);
	let successMessage = $state<string | null>(null);
	let validationError = $state<string | null>(null);

	// Derived validation
	let isValid = $derived(config.suggestionThreshold < config.autoAssignThreshold);

	onMount(async () => {
		await loadConfig();
	});

	async function loadConfig() {
		loading = true;
		error = null;

		try {
			const response = await fetch(`${API_BASE_URL}/api/v1/config/face-matching`);
			if (!response.ok) throw new Error('Failed to load configuration');

			const data = await response.json();
			config = {
				autoAssignThreshold: data.auto_assign_threshold,
				suggestionThreshold: data.suggestion_threshold,
				maxSuggestions: data.max_suggestions,
				suggestionExpiryDays: data.suggestion_expiry_days,
				prototypeMinQuality: data.prototype_min_quality,
				prototypeMaxExemplars: data.prototype_max_exemplars
			};
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load configuration';
		} finally {
			loading = false;
		}
	}

	async function saveConfig() {
		if (!isValid) {
			validationError = 'Suggestion threshold must be less than auto-assign threshold';
			return;
		}

		saving = true;
		error = null;
		validationError = null;

		try {
			const response = await fetch(`${API_BASE_URL}/api/v1/config/face-matching`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					auto_assign_threshold: config.autoAssignThreshold,
					suggestion_threshold: config.suggestionThreshold,
					max_suggestions: config.maxSuggestions,
					suggestion_expiry_days: config.suggestionExpiryDays,
					prototype_min_quality: config.prototypeMinQuality,
					prototype_max_exemplars: config.prototypeMaxExemplars
				})
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.detail || 'Failed to save configuration');
			}

			successMessage = 'Settings saved successfully';
			setTimeout(() => {
				successMessage = null;
			}, 5000);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to save configuration';
		} finally {
			saving = false;
		}
	}

	function handleThresholdChange() {
		if (config.suggestionThreshold >= config.autoAssignThreshold) {
			validationError = 'Suggestion threshold must be less than auto-assign threshold';
		} else {
			validationError = null;
		}
	}
</script>

<section class="settings-section">
	<div class="section-header">
		<h2>Face Matching Settings</h2>
		<p class="section-description">
			Configure automatic face-to-person matching thresholds and suggestion behavior. Faces with
			confidence above the auto-assign threshold are automatically assigned to persons. Faces
			between the two thresholds create suggestions for manual review.
		</p>
	</div>

	{#if loading}
		<div class="loading-state">
			<div class="spinner"></div>
			<span>Loading configuration...</span>
		</div>
	{:else if error}
		<div class="error-banner" role="alert">
			<span class="error-icon">!</span>
			<span>{error}</span>
			<button class="retry-button" onclick={loadConfig}>Retry</button>
		</div>
	{:else}
		<div class="settings-form">
			<!-- Threshold Visualization -->
			<div class="threshold-group">
				<h3>Confidence Thresholds</h3>

				<div class="threshold-visual">
					<div class="threshold-bar">
						<div class="zone zone-unassigned" style="width: {config.suggestionThreshold * 100}%">
							{#if config.suggestionThreshold >= 0.15}
								<span class="zone-label">Unassigned</span>
							{/if}
						</div>
						<div
							class="zone zone-suggestion"
							style="width: {(config.autoAssignThreshold - config.suggestionThreshold) * 100}%"
						>
							{#if config.autoAssignThreshold - config.suggestionThreshold >= 0.1}
								<span class="zone-label">Suggestions</span>
							{/if}
						</div>
						<div class="zone zone-auto" style="width: {(1 - config.autoAssignThreshold) * 100}%">
							{#if 1 - config.autoAssignThreshold >= 0.08}
								<span class="zone-label">Auto</span>
							{/if}
						</div>
					</div>
					<div class="threshold-labels">
						<span>0%</span>
						<span class="threshold-marker" style="left: {config.suggestionThreshold * 100}%">
							{(config.suggestionThreshold * 100).toFixed(0)}%
						</span>
						<span class="threshold-marker" style="left: {config.autoAssignThreshold * 100}%">
							{(config.autoAssignThreshold * 100).toFixed(0)}%
						</span>
						<span>100%</span>
					</div>
				</div>

				<!-- Threshold Inputs -->
				<div class="form-grid">
					<div class="form-field">
						<label for="autoAssignThreshold">
							Auto-assign Threshold
							<span class="field-hint">Faces above this are assigned automatically</span>
						</label>
						<div class="slider-container">
							<input
								id="autoAssignThreshold"
								type="range"
								min="0.5"
								max="1.0"
								step="0.01"
								bind:value={config.autoAssignThreshold}
								onchange={handleThresholdChange}
							/>
							<output class="slider-value">{(config.autoAssignThreshold * 100).toFixed(0)}%</output>
						</div>
					</div>

					<div class="form-field">
						<label for="suggestionThreshold">
							Suggestion Threshold
							<span class="field-hint">Faces above this create suggestions for review</span>
						</label>
						<div class="slider-container">
							<input
								id="suggestionThreshold"
								type="range"
								min="0.3"
								max="0.95"
								step="0.01"
								bind:value={config.suggestionThreshold}
								onchange={handleThresholdChange}
							/>
							<output class="slider-value">{(config.suggestionThreshold * 100).toFixed(0)}%</output>
						</div>
					</div>
				</div>

				{#if validationError}
					<div class="validation-error" role="alert">{validationError}</div>
				{/if}
			</div>

			<!-- Additional Settings -->
			<div class="other-settings">
				<h3>Additional Settings</h3>

				<div class="form-grid">
					<div class="form-field">
						<label for="maxSuggestions">
							Max Suggestions per Labeling
							<span class="field-hint">Maximum similar faces to suggest when labeling</span>
						</label>
						<input
							id="maxSuggestions"
							type="number"
							min="1"
							max="200"
							bind:value={config.maxSuggestions}
						/>
					</div>

					<div class="form-field">
						<label for="suggestionExpiryDays">
							Suggestion Expiry (days)
							<span class="field-hint">Pending suggestions expire after this many days</span>
						</label>
						<input
							id="suggestionExpiryDays"
							type="number"
							min="1"
							max="365"
							bind:value={config.suggestionExpiryDays}
						/>
					</div>
				</div>
			</div>

			<!-- Prototype Settings -->
			<div class="other-settings">
				<h3>Face Prototype Settings</h3>

				<div class="form-grid">
					<div class="form-field">
						<label for="prototypeMinQuality">
							Prototype Minimum Quality
							<span class="field-hint"
								>Minimum face quality score (0-1) required for a face to become a prototype.
								Higher values create fewer but better quality prototypes for person matching.</span
							>
						</label>
						<div class="slider-container">
							<input
								id="prototypeMinQuality"
								type="range"
								min="0.0"
								max="1.0"
								step="0.05"
								bind:value={config.prototypeMinQuality}
							/>
							<output class="slider-value">{config.prototypeMinQuality.toFixed(2)}</output>
						</div>
					</div>

					<div class="form-field">
						<label for="prototypeMaxExemplars">
							Max Prototypes Per Person
							<span class="field-hint"
								>Maximum number of prototype faces stored per person. More prototypes improve
								matching accuracy but increase storage and search time.</span
							>
						</label>
						<input
							id="prototypeMaxExemplars"
							type="number"
							min="1"
							max="20"
							bind:value={config.prototypeMaxExemplars}
						/>
					</div>
				</div>
			</div>

			<!-- Form Actions -->
			<div class="form-actions">
				<button class="btn btn-primary" onclick={saveConfig} disabled={saving || !isValid}>
					{saving ? 'Saving...' : 'Save Settings'}
				</button>
				<button class="btn btn-secondary" onclick={loadConfig} disabled={loading}> Reset </button>
			</div>
		</div>
	{/if}

	{#if successMessage}
		<div class="success-toast" role="status">{successMessage}</div>
	{/if}
</section>

<style>
	.settings-section {
		max-width: 800px;
	}

	.section-header {
		margin-bottom: 1.5rem;
	}

	.section-header h2 {
		margin: 0 0 0.5rem 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--text-primary, #1f2937);
	}

	.section-description {
		margin: 0;
		color: var(--text-muted, #6b7280);
		font-size: 0.875rem;
		line-height: 1.5;
	}

	.loading-state {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 2rem;
		color: var(--text-muted, #6b7280);
	}

	.spinner {
		width: 20px;
		height: 20px;
		border: 2px solid var(--border-color, #e5e7eb);
		border-top-color: var(--primary, #3b82f6);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.error-banner {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 8px;
		color: #dc2626;
	}

	.error-icon {
		width: 24px;
		height: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #dc2626;
		color: white;
		border-radius: 50%;
		font-weight: bold;
		font-size: 0.875rem;
	}

	.retry-button {
		margin-left: auto;
		padding: 0.375rem 0.75rem;
		background: white;
		border: 1px solid #dc2626;
		border-radius: 4px;
		color: #dc2626;
		cursor: pointer;
		font-size: 0.875rem;
	}

	.retry-button:hover {
		background: #fef2f2;
	}

	.settings-form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.threshold-group,
	.other-settings {
		padding: 1.25rem;
		background: var(--bg-secondary, #f9fafb);
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 8px;
	}

	.threshold-group h3,
	.other-settings h3 {
		margin: 0 0 1rem 0;
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-primary, #1f2937);
	}

	.threshold-visual {
		margin-bottom: 1.5rem;
	}

	.threshold-bar {
		display: flex;
		height: 36px;
		border-radius: 6px;
		overflow: hidden;
		box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
	}

	.zone {
		display: flex;
		align-items: center;
		justify-content: center;
		transition: width 0.2s ease;
	}

	.zone-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: rgba(0, 0, 0, 0.7);
		text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
	}

	.zone-unassigned {
		background: linear-gradient(135deg, #fecaca 0%, #f87171 100%);
	}

	.zone-suggestion {
		background: linear-gradient(135deg, #fef3c7 0%, #fbbf24 100%);
	}

	.zone-auto {
		background: linear-gradient(135deg, #d1fae5 0%, #34d399 100%);
	}

	.threshold-labels {
		position: relative;
		display: flex;
		justify-content: space-between;
		margin-top: 0.5rem;
		font-size: 0.75rem;
		color: var(--text-muted, #6b7280);
	}

	.threshold-marker {
		position: absolute;
		transform: translateX(-50%);
		font-weight: 600;
		color: var(--text-primary, #1f2937);
	}

	.form-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1.25rem;
	}

	.form-field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-field label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary, #1f2937);
	}

	.field-hint {
		display: block;
		font-size: 0.75rem;
		font-weight: 400;
		color: var(--text-muted, #6b7280);
		margin-top: 0.125rem;
	}

	.slider-container {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.slider-container input[type='range'] {
		flex: 1;
		height: 6px;
		appearance: none;
		background: var(--border-color, #e5e7eb);
		border-radius: 3px;
		cursor: pointer;
	}

	.slider-container input[type='range']::-webkit-slider-thumb {
		appearance: none;
		width: 18px;
		height: 18px;
		background: var(--primary, #3b82f6);
		border-radius: 50%;
		cursor: pointer;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
	}

	.slider-value {
		min-width: 48px;
		padding: 0.25rem 0.5rem;
		background: var(--bg-tertiary, #f3f4f6);
		border-radius: 4px;
		font-size: 0.875rem;
		font-weight: 600;
		text-align: center;
		color: var(--text-primary, #1f2937);
	}

	.form-field input[type='number'] {
		padding: 0.625rem 0.75rem;
		border: 1px solid var(--border-color, #e5e7eb);
		border-radius: 6px;
		font-size: 0.875rem;
		background: white;
	}

	.form-field input[type='number']:focus {
		outline: none;
		border-color: var(--primary, #3b82f6);
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.validation-error {
		margin-top: 0.75rem;
		padding: 0.625rem 0.875rem;
		background: #fef2f2;
		border: 1px solid #fecaca;
		border-radius: 6px;
		color: #dc2626;
		font-size: 0.875rem;
	}

	.form-actions {
		display: flex;
		gap: 0.75rem;
		padding-top: 0.5rem;
	}

	.btn {
		padding: 0.625rem 1.25rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		border: none;
		transition: all 0.15s ease;
	}

	.btn-primary {
		background: var(--primary, #3b82f6);
		color: white;
	}

	.btn-primary:hover:not(:disabled) {
		background: var(--primary-dark, #2563eb);
	}

	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-secondary {
		background: white;
		color: var(--text-primary, #1f2937);
		border: 1px solid var(--border-color, #e5e7eb);
	}

	.btn-secondary:hover:not(:disabled) {
		background: var(--bg-secondary, #f9fafb);
	}

	.success-toast {
		position: fixed;
		bottom: 1.5rem;
		right: 1.5rem;
		padding: 0.875rem 1.25rem;
		background: #10b981;
		color: white;
		border-radius: 8px;
		font-size: 0.875rem;
		font-weight: 500;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		animation: slideIn 0.3s ease-out;
		z-index: 1000;
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
