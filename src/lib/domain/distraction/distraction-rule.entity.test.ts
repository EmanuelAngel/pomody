import { describe, it, expect } from 'vitest';
import { matchesRule, normalizeExe, type DistractionRule } from './distraction-rule.entity';

function createRule(overrides: Partial<DistractionRule> = {}): DistractionRule {
	return {
		id: 'rule-1',
		exe: 'chrome',
		createdAt: 1_700_000_000_000,
		...overrides
	};
}

describe('normalizeExe', () => {
	it('keeps an already normalized executable name unchanged', () => {
		expect(normalizeExe('chrome')).toBe('chrome');
	});

	it('lowercases the executable name', () => {
		expect(normalizeExe('Chrome')).toBe('chrome');
	});

	it('drops the .exe extension case-insensitively', () => {
		expect(normalizeExe('Steam.EXE')).toBe('steam');
	});

	it('drops the Windows path prefix and keeps the basename', () => {
		expect(normalizeExe('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')).toBe(
			'chrome'
		);
	});

	it('drops the POSIX path prefix and keeps the basename', () => {
		expect(normalizeExe('/usr/bin/firefox')).toBe('firefox');
	});

	it('trims surrounding whitespace before normalizing', () => {
		expect(normalizeExe('  steam.exe  ')).toBe('steam');
	});

	it('strips only the trailing .exe and preserves other dots in the name', () => {
		expect(normalizeExe('my.app.exe')).toBe('my.app');
	});

	it('returns an empty string for empty input', () => {
		expect(normalizeExe('')).toBe('');
	});
});

describe('matchesRule', () => {
	it('matches any window of the application when no title pattern is declared', () => {
		const rule = createRule();

		expect(matchesRule(rule, { exe: 'chrome.exe', title: 'Inbox - Mail' })).toBe(true);
		expect(matchesRule(rule, { exe: 'chrome.exe', title: 'Something else entirely' })).toBe(true);
	});

	it('normalizes the observed executable before comparing it', () => {
		const rule = createRule({ exe: 'chrome' });

		expect(
			matchesRule(rule, { exe: 'C:\\Program Files\\Google\\Chrome\\CHROME.EXE', title: 'Docs' })
		).toBe(true);
	});

	it('does not match a different application even when the title matches', () => {
		const rule = createRule({ exe: 'chrome', titlePattern: 'YouTube' });

		expect(matchesRule(rule, { exe: 'firefox.exe', title: 'YouTube' })).toBe(false);
	});

	it('matches a title substring case-insensitively', () => {
		const rule = createRule({ titlePattern: 'YouTube' });

		expect(matchesRule(rule, { exe: 'chrome.exe', title: 'youtube - Google Chrome' })).toBe(true);
	});

	it('matches when the declared pattern is lowercase and the title has different casing', () => {
		const rule = createRule({ titlePattern: 'reddit' });

		expect(matchesRule(rule, { exe: 'chrome.exe', title: 'r/ALL - Reddit' })).toBe(true);
	});

	it('does not match when the pattern is not a substring of the title', () => {
		const rule = createRule({ titlePattern: 'YouTube' });

		expect(matchesRule(rule, { exe: 'chrome.exe', title: 'Inbox - Mail' })).toBe(false);
	});

	it('treats an empty pattern as the whole application', () => {
		const rule = createRule({ titlePattern: '' });

		expect(matchesRule(rule, { exe: 'chrome.exe', title: 'Anything' })).toBe(true);
	});

	it('treats a whitespace-only pattern as the whole application', () => {
		const rule = createRule({ titlePattern: '   ' });

		expect(matchesRule(rule, { exe: 'chrome.exe', title: 'Anything' })).toBe(true);
	});
});
