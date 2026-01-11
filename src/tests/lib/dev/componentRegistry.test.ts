import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
	createComponentStack,
	registerComponent,
	getComponentStack,
	getComponentCounts,
	formatComponentPath,
	getComponentType
} from '$lib/dev/componentRegistry.svelte';

// Mock import.meta.env.DEV
vi.stubGlobal('import', {
	meta: {
		env: {
			DEV: true
		}
	}
});

describe('componentRegistry', () => {
	// Note: createComponentStack uses $state rune which can only run inside .svelte files
	// We skip this test and rely on integration testing in actual components

	describe('getComponentType', () => {
		it('should identify route components', () => {
			expect(getComponentType('routes/search/+page')).toBe('route');
			expect(getComponentType('+page')).toBe('route');
		});

		it('should identify layout components', () => {
			expect(getComponentType('routes/+layout')).toBe('layout');
			expect(getComponentType('+layout')).toBe('layout');
		});

		it('should identify regular components', () => {
			expect(getComponentType('components/SearchBox')).toBe('component');
			expect(getComponentType('MyComponent')).toBe('component');
		});
	});

	describe('formatComponentPath', () => {
		it('should format empty stack', () => {
			const stack = { components: [], lastUpdate: Date.now() };
			expect(formatComponentPath(stack)).toBe('');
		});

		it('should format single component', () => {
			const stack = {
				components: [
					{
						name: 'TestComponent',
						id: 'test-1',
						mountedAt: Date.now()
					}
				],
				lastUpdate: Date.now()
			};
			expect(formatComponentPath(stack)).toBe('TestComponent');
		});

		it('should format multiple components with arrow separator', () => {
			const stack = {
				components: [
					{
						name: 'Layout',
						id: 'layout-1',
						mountedAt: Date.now()
					},
					{
						name: 'Page',
						id: 'page-1',
						mountedAt: Date.now()
					}
				],
				lastUpdate: Date.now()
			};
			expect(formatComponentPath(stack)).toBe('Layout → Page');
		});
	});

	describe('getComponentCounts', () => {
		it('should count unique components', () => {
			const stack = {
				components: [
					{ name: 'ComponentA', id: 'a-1', mountedAt: Date.now() },
					{ name: 'ComponentB', id: 'b-1', mountedAt: Date.now() },
					{ name: 'ComponentA', id: 'a-2', mountedAt: Date.now() }
				],
				lastUpdate: Date.now()
			};

			const counts = getComponentCounts(stack);
			expect(counts.get('ComponentA')).toBe(2);
			expect(counts.get('ComponentB')).toBe(1);
		});

		it('should handle empty stack', () => {
			const stack = { components: [], lastUpdate: Date.now() };
			const counts = getComponentCounts(stack);
			expect(counts.size).toBe(0);
		});
	});
});
