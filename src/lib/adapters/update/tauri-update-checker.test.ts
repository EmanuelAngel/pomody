import { describe, it, expect, vi } from 'vitest';
import {
	TauriUpdateChecker,
	type TauriUpdateClientLike,
	type TauriUpdateLike
} from './tauri-update-checker';

function createUpdate(overrides: Partial<TauriUpdateLike> = {}): TauriUpdateLike {
	return {
		version: '0.20.0',
		body: '### Features\n- Auto update',
		date: '2026-10-23T12:00:00Z',
		downloadAndInstall: vi.fn(async () => {}),
		...overrides
	};
}

function createClient(results: (TauriUpdateLike | null | Error)[]): {
	client: TauriUpdateClientLike;
	check: ReturnType<typeof vi.fn>;
} {
	const queue = [...results];
	const check = vi.fn(async () => {
		const next = queue.shift() ?? null;
		if (next instanceof Error) {
			throw next;
		}

		return next;
	});

	return { client: { check }, check };
}

describe('TauriUpdateChecker', () => {
	describe('isSupported', () => {
		it('should be supported when a native client is available', () => {
			const { client } = createClient([]);

			expect(new TauriUpdateChecker(client).isSupported).toBe(true);
		});

		it('should be unsupported when there is no Tauri runtime', () => {
			expect(new TauriUpdateChecker(null).isSupported).toBe(false);
		});
	});

	describe('check', () => {
		it('should describe the update by version, notes and publication date', async () => {
			const { client } = createClient([createUpdate()]);

			await expect(new TauriUpdateChecker(client).check()).resolves.toEqual({
				version: '0.20.0',
				notes: '### Features\n- Auto update',
				publishedAt: '2026-10-23T12:00:00Z'
			});
		});

		it('should report missing notes and date as null', async () => {
			const { client } = createClient([createUpdate({ body: undefined, date: undefined })]);

			await expect(new TauriUpdateChecker(client).check()).resolves.toEqual({
				version: '0.20.0',
				notes: null,
				publishedAt: null
			});
		});

		it('should resolve null when the app is up to date', async () => {
			const { client } = createClient([null]);

			await expect(new TauriUpdateChecker(client).check()).resolves.toBeNull();
		});

		it('should reject when the feed cannot be reached so the state can tell it from "up to date"', async () => {
			const { client } = createClient([new Error('network down')]);

			await expect(new TauriUpdateChecker(client).check()).rejects.toThrow('network down');
		});

		it('should resolve null without a Tauri runtime', async () => {
			await expect(new TauriUpdateChecker(null).check()).resolves.toBeNull();
		});
	});

	describe('installPending', () => {
		it('should download and install the update found by the last check, once', async () => {
			const update = createUpdate();
			const { client } = createClient([update]);
			const checker = new TauriUpdateChecker(client);

			await checker.check();
			await checker.installPending();

			expect(update.downloadAndInstall).toHaveBeenCalledTimes(1);
		});

		it('should do nothing when no update was found', async () => {
			const { client } = createClient([null]);
			const checker = new TauriUpdateChecker(client);

			await checker.check();

			await expect(checker.installPending()).resolves.toBeUndefined();
		});

		it('should drop a stale update when a later check finds none', async () => {
			const stale = createUpdate();
			const { client } = createClient([stale, null]);
			const checker = new TauriUpdateChecker(client);

			await checker.check();
			await checker.check();
			await checker.installPending();

			expect(stale.downloadAndInstall).not.toHaveBeenCalled();
		});

		it('should reject when the download fails', async () => {
			const update = createUpdate({
				downloadAndInstall: vi.fn(async () => {
					throw new Error('signature mismatch');
				})
			});
			const { client } = createClient([update]);
			const checker = new TauriUpdateChecker(client);

			await checker.check();

			await expect(checker.installPending()).rejects.toThrow('signature mismatch');
		});

		it('should resolve without a Tauri runtime', async () => {
			await expect(new TauriUpdateChecker(null).installPending()).resolves.toBeUndefined();
		});
	});
});
