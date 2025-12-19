import { listSessions } from '$lib/api/training';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	try {
		const response = await listSessions(1, 50);
		return {
			sessions: response.items,
			total: response.total,
			page: response.page,
			pageSize: response.pageSize
		};
	} catch (error) {
		console.error('Failed to load training sessions:', error);
		return {
			sessions: [],
			total: 0,
			page: 1,
			pageSize: 50,
			error: error instanceof Error ? error.message : 'Failed to load sessions'
		};
	}
};
