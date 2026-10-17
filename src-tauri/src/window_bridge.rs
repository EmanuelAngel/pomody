//! Windows window bridge for the distraction detector (spec §8).
//!
//! The whole native surface of the feature lives here, and it is deliberately the
//! minimum: the frontend polls these two reads and Rust only answers "which window is in
//! front" and "which windows are open" (spec §2 P5). No thread of its own, no
//! Rust→frontend event channel, no second window. Every judgement — matching, cadence,
//! silence — stays in the pure TypeScript domain.
//!
//! Windows-only by construction, which is the only desktop target of this project
//! (AGENTS.md rule 9). Keeping every `unsafe` call in this one file is what makes the
//! bridge auditable at a glance.

use serde::Serialize;
use windows_sys::Win32::Foundation::{CloseHandle, HANDLE, HWND, LPARAM};
use windows_sys::Win32::System::SystemInformation::GetTickCount;
use windows_sys::Win32::System::Threading::{
	OpenProcess, QueryFullProcessImageNameW, PROCESS_QUERY_LIMITED_INFORMATION,
};
use windows_sys::Win32::UI::Input::KeyboardAndMouse::{GetLastInputInfo, LASTINPUTINFO};
use windows_sys::Win32::UI::WindowsAndMessaging::{
	EnumWindows, GetForegroundWindow, GetWindowTextLengthW, GetWindowTextW,
	GetWindowThreadProcessId, IsWindowVisible,
};

/// Capacity of the executable-path buffer handed to `QueryFullProcessImageNameW`.
///
/// The legacy `MAX_PATH` is 260, but long paths on Windows 10+ can exceed it and the API
/// fails instead of truncating when the buffer is too small — which would silently drop
/// windows that are perfectly readable. One generous fixed buffer keeps it to a single
/// call.
const EXECUTABLE_PATH_CAPACITY: usize = 1024;

/// One observed top-level window, as sent to the frontend (spec §8).
///
/// One shape answers both commands, which is what the spec's two signatures declare.
/// `exe` is the raw executable path the OS reports: normalizing it into a rule key
/// (`chrome`, `steam`) is a domain concept (`normalizeExe`) and does not belong to Rust.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowInfo {
	pub exe: String,
	pub title: String,
	/// Seconds since the last machine-wide user input (`GetLastInputInfo`).
	pub idle_seconds: u64,
}

/// Seconds since the last user input, machine-wide.
///
/// `GetTickCount` and `LASTINPUTINFO::dwTime` are both 32-bit milliseconds since boot and
/// wrap after ~49.7 days, so the subtraction wraps on purpose: only the difference
/// matters and it stays correct across the wrap. A failed call answers `0`, the neutral
/// "just seen" value; `GetLastInputInfo` only fails on a malformed struct or a
/// non-interactive session, and the frontend polls again in a few seconds.
fn idle_seconds() -> u64 {
	unsafe {
		let mut info = LASTINPUTINFO {
			cbSize: std::mem::size_of::<LASTINPUTINFO>() as u32,
			dwTime: 0,
		};

		if GetLastInputInfo(&mut info) == 0 {
			return 0;
		}

		u64::from(GetTickCount().wrapping_sub(info.dwTime)) / 1000
	}
}

/// Title of a window, or `None` when it has none.
///
/// `GetWindowTextLengthW` is the only reliable emptiness test: a window can be visible
/// and untitled, and a zero-length read would not distinguish that from a failure.
fn window_title(hwnd: HWND) -> Option<String> {
	unsafe {
		let len = GetWindowTextLengthW(hwnd);
		if len <= 0 {
			return None;
		}

		let mut buffer = vec![0u16; len as usize + 1];
		let copied = GetWindowTextW(hwnd, buffer.as_mut_ptr(), buffer.len() as i32);
		if copied <= 0 {
			return None;
		}

		let title = String::from_utf16_lossy(&buffer[..copied as usize])
			.trim()
			.to_string();

		if title.is_empty() {
			None
		} else {
			Some(title)
		}
	}
}

/// Full executable path of the process owning a window, or `None` when it cannot be read.
///
/// Two cases are dropped here, both on purpose (spec §8): Pomody's own windows, compared
/// by process id — so every window of this process disappears, not only the main one —
/// and processes whose executable we are not allowed to read, such as an elevated
/// application observed by a non-elevated Pomody or a protected system process. Dropping
/// that window is the documented behaviour, not a defect to correct.
fn process_image_path(hwnd: HWND) -> Option<String> {
	unsafe {
		let mut process_id: u32 = 0;
		GetWindowThreadProcessId(hwnd, &mut process_id);

		if process_id == 0 || process_id == std::process::id() {
			return None;
		}

		let process: HANDLE = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, process_id);
		if process.is_null() {
			return None;
		}

		let mut buffer = [0u16; EXECUTABLE_PATH_CAPACITY];
		let mut size = buffer.len() as u32;
		let succeeded = QueryFullProcessImageNameW(process, 0, buffer.as_mut_ptr(), &mut size);

		// Closed before every early return below, so the handle never leaks.
		CloseHandle(process);

		if succeeded == 0 || size == 0 {
			return None;
		}

		let path = String::from_utf16_lossy(&buffer[..size as usize]);

		if path.is_empty() {
			None
		} else {
			Some(path)
		}
	}
}

/// Turns one window handle into an observation, or `None` when the window must be
/// discarded: invisible, untitled, owned by this process, or with an unreadable
/// executable.
///
/// Both commands share this single filter, so the polled observation and the picker can
/// never disagree about which windows are valid.
fn describe_window(hwnd: HWND, idle_seconds: u64) -> Option<WindowInfo> {
	if hwnd.is_null() || unsafe { IsWindowVisible(hwnd) } == 0 {
		return None;
	}

	let title = window_title(hwnd)?;
	let exe = process_image_path(hwnd)?;

	Some(WindowInfo {
		exe,
		title,
		idle_seconds,
	})
}

/// Enumeration scratch space, handed to the Win32 callback through `LPARAM`.
struct Enumeration {
	idle_seconds: u64,
	windows: Vec<WindowInfo>,
}

/// `EnumWindows` callback: appends one window and always asks for the next one.
///
/// Returning `1` unconditionally is what makes unreadable processes "skipped without
/// breaking the enumeration" (issue #125): a dropped window is not an error, and
/// aborting the loop there would hide every window that comes after it.
///
/// # Safety
///
/// `lparam` must be the `&mut Enumeration` passed by [`open_windows`], which outlives the
/// call. The callback only pushes into that vector.
unsafe extern "system" fn collect_window(hwnd: HWND, lparam: LPARAM) -> i32 {
	// SAFETY: guaranteed by this function's contract above.
	let enumeration = unsafe { &mut *(lparam as *mut Enumeration) };

	if let Some(info) = describe_window(hwnd, enumeration.idle_seconds) {
		enumeration.windows.push(info);
	}

	1
}

/// Foreground window, or `None` when there is nothing valid to report (spec §8).
///
/// `None` is also the documented answer when Pomody itself is in front: the app can never
/// be a rule the user declared, so it must never be observed (spec §4).
pub fn active_window() -> Option<WindowInfo> {
	describe_window(unsafe { GetForegroundWindow() }, idle_seconds())
}

/// Every top-level window the picker may offer: visible, titled, not ours, with a
/// readable executable (spec §8).
///
/// The idle time is machine-wide, so every entry carries the same value; the picker reads
/// only `exe` and `title`, and the shared shape is what the spec declares.
pub fn open_windows() -> Vec<WindowInfo> {
	let mut enumeration = Enumeration {
		idle_seconds: idle_seconds(),
		windows: Vec::new(),
	};

	// SAFETY: `enumeration` outlives the call and the callback writes only into it.
	unsafe {
		EnumWindows(
			Some(collect_window),
			&mut enumeration as *mut Enumeration as LPARAM,
		);
	}

	enumeration.windows
}
