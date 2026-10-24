/**
 * Calendar arithmetic on local `YYYY-MM-DD` keys. Everything goes through UTC date math on the key,
 * never a local `Date`, so a DST jump or the machine's timezone can never shift a day.
 * Keys are expected to be valid calendar days (`getLocalDateString`, `localDateKey`).
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_WEEK = 7;

function keyToUtcMs(dateKey: string): number {
	const [year, month, day] = dateKey.split('-').map(Number);
	return Date.UTC(year, month - 1, day);
}

function utcMsToKey(ms: number): string {
	const date = new Date(ms);
	const year = String(date.getUTCFullYear()).padStart(4, '0');
	const month = String(date.getUTCMonth() + 1).padStart(2, '0');
	const day = String(date.getUTCDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/** The day `offset` calendar days away from `dateKey` (negative goes back). */
export function addDaysToKey(dateKey: string, offset: number): string {
	return utcMsToKey(keyToUtcMs(dateKey) + offset * MS_PER_DAY);
}

/** ISO weekday of a day: 1 = Monday ... 7 = Sunday, the numbering of `restWeekdays`. */
export function isoWeekdayOfKey(dateKey: string): number {
	const day = new Date(keyToUtcMs(dateKey)).getUTCDay();
	return day === 0 ? 7 : day;
}

/** Monday of the ISO week that contains `dateKey`. */
export function weekStartKey(dateKey: string): string {
	return addDaysToKey(dateKey, 1 - isoWeekdayOfKey(dateKey));
}

/** The Monday `offset` weeks away from `weekStart` (negative goes back). */
export function shiftWeek(weekStart: string, offset: number): string {
	return addDaysToKey(weekStart, offset * DAYS_PER_WEEK);
}

/** The seven day keys of the week starting on `weekStart`, Monday to Sunday. */
export function weekDayKeys(weekStart: string): string[] {
	const monday = weekStartKey(weekStart);
	return Array.from({ length: DAYS_PER_WEEK }, (_, index) => addDaysToKey(monday, index));
}
