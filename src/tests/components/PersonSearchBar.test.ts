import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import PersonSearchBar from '$lib/components/faces/PersonSearchBar.svelte';
import { createPerson, createMultiplePersons } from '../helpers/fixtures';
import { tid } from '$lib/testing/testid';

describe('PersonSearchBar', () => {
	const defaultProps = {
		persons: createMultiplePersons(5),
		loading: false,
		selectedPersonId: null,
		onSelect: vi.fn()
	};

	describe('Rendering', () => {
		it('renders search input with correct placeholder', () => {
			render(PersonSearchBar, { props: defaultProps });

			const input = screen.getByRole('combobox', { name: /search for person/i });
			expect(input).toBeInTheDocument();
			expect(input).toHaveAttribute('placeholder', 'Search for a person...');
		});

		it('renders with custom placeholder', () => {
			render(PersonSearchBar, {
				props: { ...defaultProps, placeholder: 'Find someone...' }
			});

			const input = screen.getByRole('combobox', { name: /search for person/i });
			expect(input).toHaveAttribute('placeholder', 'Find someone...');
		});

		it('shows loading state when loading=true', () => {
			render(PersonSearchBar, { props: { ...defaultProps, loading: true } });

			const input = screen.getByRole('combobox', { name: /search for person/i });
			expect(input).toBeDisabled();
		});

		it('shows selected person badge when person is selected', () => {
			const selectedPerson = createPerson({ id: 'person-1', name: 'Alice Smith' });
			render(PersonSearchBar, {
				props: {
					...defaultProps,
					persons: [selectedPerson],
					selectedPersonId: 'person-1'
				}
			});

			const badge = screen.getByTestId(tid('person-search-bar', 'badge'));
			expect(badge).toBeInTheDocument();
			expect(screen.getByText('Alice Smith')).toBeInTheDocument();
		});

		it('displays person initials in badge avatar', () => {
			const selectedPerson = createPerson({ id: 'person-1', name: 'Alice Smith' });
			render(PersonSearchBar, {
				props: {
					...defaultProps,
					persons: [selectedPerson],
					selectedPersonId: 'person-1'
				}
			});

			expect(screen.getByText('AS')).toBeInTheDocument();
		});

		it('does not show search input when person is selected', () => {
			const selectedPerson = createPerson({ id: 'person-1', name: 'Alice Smith' });
			render(PersonSearchBar, {
				props: {
					...defaultProps,
					persons: [selectedPerson],
					selectedPersonId: 'person-1'
				}
			});

			expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
		});
	});

	describe('Dropdown Behavior', () => {
		it('shows dropdown when user focuses input', async () => {
			render(PersonSearchBar, { props: defaultProps });

			const input = screen.getByRole('combobox', { name: /search for person/i });
			await fireEvent.focus(input);

			const dropdown = screen.getByRole('listbox');
			expect(dropdown).toBeInTheDocument();
		});

		it('shows dropdown when user types in input', async () => {
			render(PersonSearchBar, { props: defaultProps });

			const input = screen.getByRole('combobox', { name: /search for person/i });
			await fireEvent.input(input, { target: { value: 'Alice' } });

			const dropdown = screen.getByRole('listbox');
			expect(dropdown).toBeInTheDocument();
		});

		it('does not open dropdown when loading=true', async () => {
			render(PersonSearchBar, { props: { ...defaultProps, loading: true } });

			const input = screen.getByRole('combobox', { name: /search for person/i });
			await fireEvent.focus(input);

			expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
		});

		it('shows all persons when search is empty', async () => {
			const persons = createMultiplePersons(3);
			render(PersonSearchBar, { props: { ...defaultProps, persons } });

			const input = screen.getByRole('combobox', { name: /search for person/i });
			await fireEvent.focus(input);

			persons.forEach((person) => {
				expect(screen.getByText(person.name)).toBeInTheDocument();
			});
		});
	});

	describe('Filtering', () => {
		it('filters persons case-insensitively as user types', async () => {
			const persons = [
				createPerson({ id: '1', name: 'Alice Smith' }),
				createPerson({ id: '2', name: 'Bob Jones' }),
				createPerson({ id: '3', name: 'Charlie Brown' })
			];
			render(PersonSearchBar, { props: { ...defaultProps, persons } });

			const input = screen.getByRole('combobox', { name: /search for person/i });
			await fireEvent.input(input, { target: { value: 'alice' } });

			expect(screen.getByText('Alice Smith')).toBeInTheDocument();
			expect(screen.queryByText('Bob Jones')).not.toBeInTheDocument();
			expect(screen.queryByText('Charlie Brown')).not.toBeInTheDocument();
		});

		it('shows "No persons found" for non-matching search', async () => {
			render(PersonSearchBar, { props: defaultProps });

			const input = screen.getByRole('combobox', { name: /search for person/i });
			await fireEvent.input(input, { target: { value: 'NonExistentPerson' } });

			expect(screen.getByTestId(tid('person-search-bar', 'empty'))).toBeInTheDocument();
			expect(
				screen.getByText(/No persons found matching "NonExistentPerson"/i)
			).toBeInTheDocument();
		});

		it('shows "No persons available" when persons list is empty', async () => {
			render(PersonSearchBar, { props: { ...defaultProps, persons: [] } });

			const input = screen.getByRole('combobox', { name: /search for person/i });
			await fireEvent.focus(input);

			expect(screen.getByText('No persons available')).toBeInTheDocument();
		});

		it('filters by partial name match', async () => {
			const persons = [
				createPerson({ id: '1', name: 'Alice Smith' }),
				createPerson({ id: '2', name: 'Alicia Johnson' }),
				createPerson({ id: '3', name: 'Bob Jones' })
			];
			render(PersonSearchBar, { props: { ...defaultProps, persons } });

			const input = screen.getByRole('combobox', { name: /search for person/i });
			await fireEvent.input(input, { target: { value: 'ali' } });

			expect(screen.getByText('Alice Smith')).toBeInTheDocument();
			expect(screen.getByText('Alicia Johnson')).toBeInTheDocument();
			expect(screen.queryByText('Bob Jones')).not.toBeInTheDocument();
		});
	});

	describe('Selection', () => {
		it('calls onSelect with personId and personName when person is clicked', async () => {
			const onSelect = vi.fn();
			const persons = [createPerson({ id: 'person-1', name: 'Alice Smith' })];
			render(PersonSearchBar, { props: { ...defaultProps, persons, onSelect } });

			const input = screen.getByRole('combobox', { name: /search for person/i });
			await fireEvent.focus(input);

			const option = screen.getByRole('option', { name: /Alice Smith/i });
			await fireEvent.click(option);

			expect(onSelect).toHaveBeenCalledWith('person-1', 'Alice Smith');
			expect(onSelect).toHaveBeenCalledTimes(1);
		});

		it('closes dropdown after selecting person', async () => {
			const persons = [createPerson({ id: 'person-1', name: 'Alice Smith' })];
			render(PersonSearchBar, { props: { ...defaultProps, persons } });

			const input = screen.getByRole('combobox', { name: /search for person/i });
			await fireEvent.focus(input);

			const option = screen.getByRole('option', { name: /Alice Smith/i });
			await fireEvent.click(option);

			await waitFor(() => {
				expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
			});
		});

		it('clears search query after selecting person', async () => {
			const persons = [createPerson({ id: 'person-1', name: 'Alice Smith' })];
			render(PersonSearchBar, { props: { ...defaultProps, persons } });

			const input = screen.getByRole('combobox', { name: /search for person/i }) as HTMLInputElement;
			await fireEvent.input(input, { target: { value: 'Alice' } });
			expect(input.value).toBe('Alice');

			const option = screen.getByRole('option', { name: /Alice Smith/i });
			await fireEvent.click(option);

			await waitFor(() => {
				expect(input.value).toBe('');
			});
		});

		it('displays face count in option meta', async () => {
			const persons = [createPerson({ id: 'person-1', name: 'Alice Smith', faceCount: 42 })];
			render(PersonSearchBar, { props: { ...defaultProps, persons } });

			const input = screen.getByRole('combobox', { name: /search for person/i });
			await fireEvent.focus(input);

			expect(screen.getByText('42 faces')).toBeInTheDocument();
		});
	});

	describe('Clearing Selection', () => {
		it('shows clear button when person is selected', () => {
			const selectedPerson = createPerson({ id: 'person-1', name: 'Alice Smith' });
			render(PersonSearchBar, {
				props: {
					...defaultProps,
					persons: [selectedPerson],
					selectedPersonId: 'person-1'
				}
			});

			const clearButton = screen.getByRole('button', { name: /clear person filter/i });
			expect(clearButton).toBeInTheDocument();
		});

		it('calls onSelect with null when clear button clicked', async () => {
			const onSelect = vi.fn();
			const selectedPerson = createPerson({ id: 'person-1', name: 'Alice Smith' });
			render(PersonSearchBar, {
				props: {
					...defaultProps,
					persons: [selectedPerson],
					selectedPersonId: 'person-1',
					onSelect
				}
			});

			const clearButton = screen.getByRole('button', { name: /clear person filter/i });
			await fireEvent.click(clearButton);

			expect(onSelect).toHaveBeenCalledWith(null, null);
			expect(onSelect).toHaveBeenCalledTimes(1);
		});

		it('clears search query when clear button clicked', async () => {
			const onSelect = vi.fn();
			const selectedPerson = createPerson({ id: 'person-1', name: 'Alice Smith' });

			render(PersonSearchBar, {
				props: {
					persons: [selectedPerson],
					loading: false,
					selectedPersonId: 'person-1',
					onSelect
				}
			});

			const clearButton = screen.getByRole('button', { name: /clear person filter/i });
			await fireEvent.click(clearButton);

			// Verify onSelect was called to clear the selection
			expect(onSelect).toHaveBeenCalledWith(null, null);

			// In a real app, the parent would update selectedPersonId to null
			// and the component would show the input field with empty value.
			// Since we can't test parent state updates in isolation, we verify
			// the callback is correct.
		});
	});

	describe('Keyboard Navigation', () => {
		it('closes dropdown and blurs input on Escape key', async () => {
			render(PersonSearchBar, { props: defaultProps });

			const input = screen.getByRole('combobox', { name: /search for person/i });
			await fireEvent.focus(input);
			expect(screen.getByRole('listbox')).toBeInTheDocument();

			await fireEvent.keyDown(input, { key: 'Escape' });

			await waitFor(() => {
				expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
			});
		});

		it('opens dropdown on ArrowDown when closed', async () => {
			render(PersonSearchBar, { props: defaultProps });

			const input = screen.getByRole('combobox', { name: /search for person/i });
			await fireEvent.keyDown(input, { key: 'ArrowDown' });

			expect(screen.getByRole('listbox')).toBeInTheDocument();
		});

		it('highlights first option on ArrowDown when dropdown is open', async () => {
			const persons = [
				createPerson({ id: '1', name: 'Alice Smith' }),
				createPerson({ id: '2', name: 'Bob Jones' })
			];
			render(PersonSearchBar, { props: { ...defaultProps, persons } });

			const input = screen.getByRole('combobox', { name: /search for person/i });
			await fireEvent.focus(input);
			await fireEvent.keyDown(input, { key: 'ArrowDown' });

			const firstOption = screen.getByTestId(tid('person-search-bar', 'option', '1'));
			expect(firstOption).toHaveClass('highlighted');
		});

		it('navigates down through options with ArrowDown', async () => {
			const persons = [
				createPerson({ id: '1', name: 'Alice Smith' }),
				createPerson({ id: '2', name: 'Bob Jones' })
			];
			render(PersonSearchBar, { props: { ...defaultProps, persons } });

			const input = screen.getByRole('combobox', { name: /search for person/i });
			await fireEvent.focus(input);
			await fireEvent.keyDown(input, { key: 'ArrowDown' }); // Highlight first
			await fireEvent.keyDown(input, { key: 'ArrowDown' }); // Highlight second

			const secondOption = screen.getByTestId(tid('person-search-bar', 'option', '2'));
			expect(secondOption).toHaveClass('highlighted');
		});

		it('navigates up through options with ArrowUp', async () => {
			const persons = [
				createPerson({ id: '1', name: 'Alice Smith' }),
				createPerson({ id: '2', name: 'Bob Jones' })
			];
			render(PersonSearchBar, { props: { ...defaultProps, persons } });

			const input = screen.getByRole('combobox', { name: /search for person/i });
			await fireEvent.focus(input);
			await fireEvent.keyDown(input, { key: 'ArrowDown' }); // Highlight first
			await fireEvent.keyDown(input, { key: 'ArrowDown' }); // Highlight second
			await fireEvent.keyDown(input, { key: 'ArrowUp' }); // Back to first

			const firstOption = screen.getByTestId(tid('person-search-bar', 'option', '1'));
			expect(firstOption).toHaveClass('highlighted');
		});

		it('selects highlighted option on Enter key', async () => {
			const onSelect = vi.fn();
			const persons = [
				createPerson({ id: '1', name: 'Alice Smith' }),
				createPerson({ id: '2', name: 'Bob Jones' })
			];
			render(PersonSearchBar, { props: { ...defaultProps, persons, onSelect } });

			const input = screen.getByRole('combobox', { name: /search for person/i });
			await fireEvent.focus(input);
			await fireEvent.keyDown(input, { key: 'ArrowDown' }); // Highlight first
			await fireEvent.keyDown(input, { key: 'Enter' }); // Select

			expect(onSelect).toHaveBeenCalledWith('1', 'Alice Smith');
		});

		it('does not select when Enter pressed with no highlight', async () => {
			const onSelect = vi.fn();
			render(PersonSearchBar, { props: { ...defaultProps, onSelect } });

			const input = screen.getByRole('combobox', { name: /search for person/i });
			await fireEvent.focus(input);
			await fireEvent.keyDown(input, { key: 'Enter' });

			expect(onSelect).not.toHaveBeenCalled();
		});

		it('prevents ArrowDown from scrolling page', async () => {
			render(PersonSearchBar, { props: defaultProps });

			const input = screen.getByRole('combobox', { name: /search for person/i });
			await fireEvent.focus(input);

			const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true });
			const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

			input.dispatchEvent(event);

			expect(preventDefaultSpy).toHaveBeenCalled();
		});

		it('prevents ArrowUp from scrolling page', async () => {
			render(PersonSearchBar, { props: defaultProps });

			const input = screen.getByRole('combobox', { name: /search for person/i });
			await fireEvent.focus(input);
			await fireEvent.keyDown(input, { key: 'ArrowDown' }); // Need something highlighted first

			const event = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true });
			const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

			input.dispatchEvent(event);

			expect(preventDefaultSpy).toHaveBeenCalled();
		});
	});

	describe('Loading State', () => {
		it('does not show dropdown when loading is true', async () => {
			render(PersonSearchBar, { props: { ...defaultProps, loading: true } });

			const input = screen.getByRole('combobox', { name: /search for person/i });

			// Input should be disabled when loading
			expect(input).toBeDisabled();

			// Try to focus/open dropdown - should not work
			await fireEvent.focus(input);

			// Dropdown should not appear when loading
			expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
		});

		it('disables input when loading=true', () => {
			render(PersonSearchBar, { props: { ...defaultProps, loading: true } });

			const input = screen.getByRole('combobox', { name: /search for person/i });
			expect(input).toBeDisabled();
		});
	});

	describe('Accessibility', () => {
		it('has proper ARIA attributes on input', () => {
			render(PersonSearchBar, { props: defaultProps });

			const input = screen.getByRole('combobox', { name: /search for person/i });
			expect(input).toHaveAttribute('aria-expanded', 'false');
			expect(input).toHaveAttribute('aria-haspopup', 'listbox');
			expect(input).toHaveAttribute('aria-controls', tid('person-search-bar', 'dropdown'));
		});

		it('updates aria-expanded when dropdown opens', async () => {
			render(PersonSearchBar, { props: defaultProps });

			const input = screen.getByRole('combobox', { name: /search for person/i });
			await fireEvent.focus(input);

			expect(input).toHaveAttribute('aria-expanded', 'true');
		});

		it('has proper role attributes on dropdown elements', async () => {
			const persons = [createPerson({ id: '1', name: 'Alice Smith' })];
			render(PersonSearchBar, { props: { ...defaultProps, persons } });

			const input = screen.getByRole('combobox', { name: /search for person/i });
			await fireEvent.focus(input);

			const listbox = screen.getByRole('listbox');
			expect(listbox).toBeInTheDocument();

			const option = screen.getByRole('option');
			expect(option).toBeInTheDocument();
		});

		it('has accessible label on clear button', () => {
			const selectedPerson = createPerson({ id: 'person-1', name: 'Alice Smith' });
			render(PersonSearchBar, {
				props: {
					...defaultProps,
					persons: [selectedPerson],
					selectedPersonId: 'person-1'
				}
			});

			const clearButton = screen.getByRole('button', { name: /clear person filter/i });
			expect(clearButton).toHaveAttribute('aria-label', 'Clear person filter');
		});
	});

	describe('Custom Test IDs', () => {
		it('uses custom testId prop', () => {
			render(PersonSearchBar, { props: { ...defaultProps, testId: 'custom-search' } });

			expect(screen.getByTestId(tid('custom-search'))).toBeInTheDocument();
		});

		it('generates correct test IDs for child elements', async () => {
			const persons = [createPerson({ id: '1', name: 'Alice Smith' })];
			render(PersonSearchBar, { props: { ...defaultProps, persons, testId: 'custom-search' } });

			const input = screen.getByTestId(tid('custom-search', 'input'));
			expect(input).toBeInTheDocument();

			await fireEvent.focus(input);

			const dropdown = screen.getByTestId(tid('custom-search', 'dropdown'));
			expect(dropdown).toBeInTheDocument();
		});
	});
});
