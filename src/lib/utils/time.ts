/**
 * Format a Date or timestamp into a relative time string.
 * Examples: "just now", "2 min ago", "3 hours ago", "2 days ago"
 */
export function formatRelativeTime(date: Date | string | number): string {
	const now = new Date();
	const then = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
	const diffMs = now.getTime() - then.getTime();
	const diffSeconds = Math.floor(diffMs / 1000);
	const diffMinutes = Math.floor(diffSeconds / 60);
	const diffHours = Math.floor(diffMinutes / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffSeconds < 60) {
		return 'just now';
	} else if (diffMinutes < 60) {
		return `${diffMinutes} min ago`;
	} else if (diffHours < 24) {
		return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
	} else {
		return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
	}
}
