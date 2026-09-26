# Judgment Day Findings: Task Domain & LocalStorage Persistence

This document records the 6 findings accepted from Judgment Day Round 1 review, their technical solutions, architectural impact, and corresponding tasks in [`odd/tasks/task-domain-and-persistence.md`](../tasks/task-domain-and-persistence.md).

---

## Finding 1: Unhandled SecurityError in `getStorage()` property getter

- **Target**: `src/lib/adapters/storage/local-task-repository.ts` (line 108)
- **Consensus Severity**: `WARNING (real)`
- **Linked Task**: [`TASK-07: Harden LocalStorageTaskRepository resilience & version safety`](../tasks/task-domain-and-persistence.md#task-07)

### Problem

`LocalStorageTaskRepository.getStorage()` checked `typeof window.localStorage !== 'undefined'` in the conditional guard _before_ entering the `try/catch` block:

```ts
if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
	try {
		return window.localStorage;
	} catch {
		return null;
	}
}
```

Evaluating `window.localStorage` invokes the property getter. In sandboxed iframes without `allow-same-origin`, private browsing modes with strict storage blocking, or environments where local storage is disabled, accessing the property throws an immediate `SecurityError` / `DOMException`. Because this occurred outside the `try` block, the exception was uncaught and crashed repository initialization.

### Solution

Evaluate `window.localStorage` strictly within the `try/catch` block directly after confirming `typeof window !== 'undefined'`:

```ts
if (typeof window !== 'undefined') {
	try {
		return window.localStorage;
	} catch {
		return null;
	}
}
```

### Impact

Prevents unhandled crashes in restricted web contexts and embedded iframes, guaranteeing graceful fallback to in-memory/null behavior as intended by the adapter design.

---

## Finding 2: Non-deterministic sorting tie-breaker in `compareFocusTasks`

- **Target**: `src/lib/domain/ports/task-repository.port.ts` (lines 7-12)
- **Consensus Severity**: `WARNING (real)`
- **Linked Task**: [`TASK-06: Ensure deterministic sorting tie-breaker in compareFocusTasks`](../tasks/task-domain-and-persistence.md#task-06)

### Problem

`compareFocusTasks` compared only `order` and `createdAt`:

```ts
if (a.order !== b.order) {
	return a.order - b.order;
}
return a.createdAt - b.createdAt;
```

When two tasks shared identical `order` (e.g. default `0`) and `createdAt` timestamp (common in batch operations or sub-millisecond task creation), `compareFocusTasks` returned `0`. In JavaScript's `Array.prototype.sort()`, returning `0` preserves engine-dependent or arbitrary insertion order, breaking the port's explicit invariant of deterministic sorting across environments.

### Solution

Add `a.id.localeCompare(b.id)` as the definitive final tie-breaker:

```ts
if (a.order !== b.order) {
	return a.order - b.order;
}
if (a.createdAt !== b.createdAt) {
	return a.createdAt - b.createdAt;
}
return a.id.localeCompare(b.id);
```

### Impact

Guarantees 100% stable, reproducible task ordering across all browsers, runtimes, and re-renders, fulfilling the core domain contract.

---

## Finding 3: Incomplete parameter validation in `createFocusTask`

- **Target**: `src/lib/domain/tasks/task.entity.ts` (lines 58-69)
- **Consensus Severity**: `WARNING (real)`
- **Linked Task**: [`TASK-05: Strengthen FocusTask domain entity parameter validation and crypto fallback`](../tasks/task-domain-and-persistence.md#task-05)

### Problem

`createFocusTask` validated `title` but lacked validation for optional parameters `id`, `order`, and `createdAt`:

```ts
const task: FocusTask = {
	id: params.id ?? crypto.randomUUID(),
	title: trimmedTitle,
	completed: false,
	createdAt: params.createdAt ?? Date.now(),
	order: params.order ?? 0
};
```

If a caller supplied `params.id = ""` (empty string or whitespace), nullish coalescing `??` did not fall back to `crypto.randomUUID()`. Similarly, non-integer or negative `order` and non-positive `createdAt` numbers were accepted into domain entities. When passed to `LocalStorageTaskRepository.save()`, `sanitizeTask` classified them as corrupt and dropped them silently with no error thrown or persisted.

### Solution

Enforce domain invariants in `createFocusTask`:

1. If `params.id` is provided, validate it is a non-empty string after trimming; throw `InvalidTaskIdError` otherwise.
2. If `params.order` is provided, validate it is a finite integer `>= 0`; throw `InvalidTaskOrderError` otherwise.
3. If `params.createdAt` is provided, validate it is a finite number `> 0`; throw `InvalidTaskCreatedAtError` otherwise.

### Impact

Protects the domain boundary: entities cannot exist in an invalid state in memory, avoiding downstream silent drops in storage layers.

---

## Finding 4: Missing secure context fallback for `crypto.randomUUID()`

- **Target**: `src/lib/domain/tasks/task.entity.ts` (line 62)
- **Consensus Severity**: `WARNING (theoretical)` (promoted for LAN dev support)
- **Linked Task**: [`TASK-05: Strengthen FocusTask domain entity parameter validation and crypto fallback`](../tasks/task-domain-and-persistence.md#task-05)

### Problem

`crypto.randomUUID()` is part of the Web Cryptography API and is restricted to Secure Contexts (`HTTPS` or `localhost`). In development scenarios accessing Vite via local network IP (e.g. `http://192.168.x.x:5173` on mobile devices), `crypto.randomUUID` is undefined. Attempting to create a task crashed with `TypeError: crypto.randomUUID is not a function`.

### Solution

Implement a safe ID generator that checks for `typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'`, and falls back to a standard RFC 4122 v4 UUID generator using `crypto.getRandomValues()` or `Math.random()`.

### Impact

Enables testing and usage across local network devices without requiring TLS certificates or external tooling.

---

## Finding 5: Unobserved storage write exceptions in `writeTasks`

- **Target**: `src/lib/adapters/storage/local-task-repository.ts` (lines 287-291)
- **Consensus Severity**: `WARNING (theoretical)` / `SUGGESTION`
- **Linked Task**: [`TASK-07: Harden LocalStorageTaskRepository resilience & version safety`](../tasks/task-domain-and-persistence.md#task-07)

### Problem

`writeTasks` caught `DOMException` / `QuotaExceededError` / `SecurityError` with an empty catch block:

```ts
try {
	storage.setItem(TASKS_STORAGE_KEY, JSON.stringify(envelope));
} catch {
	// Gracefully handle DOMException / SecurityError / QuotaExceededError
}
```

When browser quota was exceeded or write access was blocked, `save()` resolved successfully while data was lost, leaving zero traces or diagnostics in the console.

### Solution

Log a structured error or warning via `console.error` before graceful fallback so developers and monitoring tools have visibility into write failures.

### Impact

Preserves application stability without crashing the UI while providing necessary observability into storage failures.

---

## Finding 6: Destructive overwrite of newer/unrecognized storage envelope versions

- **Target**: `src/lib/adapters/storage/local-task-repository.ts` (lines 258-260)
- **Consensus Severity**: `WARNING (theoretical)`
- **Linked Task**: [`TASK-07: Harden LocalStorageTaskRepository resilience & version safety`](../tasks/task-domain-and-persistence.md#task-07)

### Problem

When `readTasks()` encountered an envelope with `version !== TASKS_STORAGE_VERSION`, it returned `[]`. If a user had multiple tabs or if a newer version of the application wrote data with `version: 2`, any write operation (`save`, `delete`, `clearCompleted`) in this version treated storage as empty and rewrote it with a version 1 envelope, permanently destroying newer data.

### Solution

Track envelope version compatibility during read. If an unsupported future version is detected (`version > TASKS_STORAGE_VERSION`), mark the repository state as version-locked/incompatible and reject or bypass destructive overwrites, preserving storage integrity.

### Impact

Guarantees forward compatibility and multi-tab safety against accidental data corruption during migrations.
