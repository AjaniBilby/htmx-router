export const TIME_SCALE = {
	year: 365 * 24 * 60 * 60 * 1000,
	month: 30 * 24 * 60 * 60 * 1000,
	week:   7 * 24 * 60 * 60 * 1000,
	day:        24 * 60 * 60 * 1000,
	hour:            60 * 60 * 1000,
	minute:               60 * 1000,
	second:                    1000
};
Object.freeze(TIME_SCALE);

export function ParseInterval(interval: string) {
	// Default to seconds
	const raw = Number(interval);
	if (!Number.isNaN(raw) && raw > 0) return raw * TIME_SCALE.second;

	const match = interval.match(/(\d+)(\s*(year|month|week|day|hour|minute|second)s?)/);
	if (!match) return 0;

	const value = parseInt(match[1]);
	const unit = match[3];

	const milliseconds = TIME_SCALE[unit.toLowerCase() as keyof typeof TIME_SCALE];
	if (!milliseconds) return 0;

	return value * milliseconds;
}