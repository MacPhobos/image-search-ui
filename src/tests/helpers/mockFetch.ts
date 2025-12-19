import { vi, type Mock } from 'vitest';

interface MockResponse {
	status?: number;
	ok?: boolean;
	data?: unknown;
	error?: Error;
}

interface MockRegistry {
	[key: string]: MockResponse;
}

let mockRegistry: MockRegistry = {};
let fetchMock: Mock | null = null;

/**
 * Install global fetch mock with vi.fn()
 */
export function installMockFetch(): void {
	fetchMock = vi.fn(async (url: string) => {
		const urlString = typeof url === 'string' ? url : url.toString();

		// Find matching mock response
		for (const [pattern, response] of Object.entries(mockRegistry)) {
			const matches =
				urlString === pattern || (pattern.startsWith('/') && new RegExp(pattern).test(urlString));

			if (matches) {
				if (response.error) {
					throw response.error;
				}

				return {
					ok: response.ok ?? true,
					status: response.status ?? 200,
					statusText: response.status === 503 ? 'Service Unavailable' : 'OK',
					json: async () => response.data
				};
			}
		}

		// Default: return empty successful response
		return {
			ok: true,
			status: 200,
			statusText: 'OK',
			json: async () => ({})
		};
	}) as Mock;

	globalThis.fetch = fetchMock;
}

/**
 * Register a mock response for a URL pattern
 * @param url - Exact URL or regex pattern (e.g., '/api/.*')
 * @param response - Response data to return
 * @param status - HTTP status code (default: 200)
 */
export function mockResponse(url: string, response: unknown, status: number = 200): void {
	mockRegistry[url] = {
		status,
		ok: status >= 200 && status < 300,
		data: response
	};
}

/**
 * Register an error response for a URL pattern
 * @param url - Exact URL or regex pattern
 * @param error - Error to throw
 */
export function mockError(url: string, error: Error): void {
	mockRegistry[url] = {
		error
	};
}

/**
 * Clear all registered mock responses and reset fetch mock
 */
export function resetMocks(): void {
	mockRegistry = {};
	if (fetchMock) {
		fetchMock.mockClear();
	}
}

/**
 * Assert that fetch was called with the given URL
 * @param url - URL to check
 */
export function assertCalled(url: string): void {
	if (!fetchMock) {
		throw new Error('mockFetch not installed. Call installMockFetch() first.');
	}

	const calls = fetchMock.mock.calls;
	const found = calls.some((call) => {
		const callUrl = typeof call[0] === 'string' ? call[0] : call[0].toString();
		return callUrl.includes(url) || callUrl === url;
	});

	if (!found) {
		throw new Error(
			`Expected fetch to be called with URL containing "${url}", but it was not. Calls: ${JSON.stringify(calls.map((c) => c[0]))}`
		);
	}
}

/**
 * Assert that fetch was NOT called with the given URL
 * @param url - URL to check
 */
export function assertNotCalled(url: string): void {
	if (!fetchMock) {
		throw new Error('mockFetch not installed. Call installMockFetch() first.');
	}

	const calls = fetchMock.mock.calls;
	const found = calls.some((call) => {
		const callUrl = typeof call[0] === 'string' ? call[0] : call[0].toString();
		return callUrl.includes(url) || callUrl === url;
	});

	if (found) {
		throw new Error(
			`Expected fetch NOT to be called with URL containing "${url}", but it was. Calls: ${JSON.stringify(calls.map((c) => c[0]))}`
		);
	}
}

/**
 * Get the fetch mock instance for advanced assertions
 */
export function getFetchMock(): Mock {
	if (!fetchMock) {
		throw new Error('mockFetch not installed. Call installMockFetch() first.');
	}
	return fetchMock;
}
