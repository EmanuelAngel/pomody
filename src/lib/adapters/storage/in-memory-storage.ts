/**
 * Standard Web Storage API compliant in-memory storage fallback.
 * Used when localStorage is unavailable, restricted (SecurityError), or in SSR/Node contexts.
 *
 * This is the repository's ONLY Storage implementation: adapters use it as their SSR
 * fallback and tests use it as their double. Do not hand-roll another one.
 */
export class InMemoryStorage implements Storage {
	private readonly items = new Map<string, string>();

	public get length(): number {
		return this.items.size;
	}

	public clear(): void {
		this.items.clear();
	}

	public getItem(key: string): string | null {
		return this.items.get(key) ?? null;
	}

	public key(index: number): string | null {
		return Array.from(this.items.keys())[index] ?? null;
	}

	public removeItem(key: string): void {
		this.items.delete(key);
	}

	public setItem(key: string, value: string): void {
		this.items.set(key, String(value));
	}
}
