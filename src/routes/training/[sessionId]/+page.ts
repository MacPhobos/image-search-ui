import { getSession } from '$lib/api/training';
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	const sessionId = parseInt(params.sessionId, 10);

	if (isNaN(sessionId)) {
		throw error(400, 'Invalid session ID');
	}

	try {
		const session = await getSession(sessionId);
		return {
			session
		};
	} catch (err) {
		console.error('Failed to load training session:', err);
		throw error(404, 'Training session not found');
	}
};
