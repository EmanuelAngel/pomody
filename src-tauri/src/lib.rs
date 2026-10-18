use tauri::{
	menu::{MenuBuilder, MenuItem},
	tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
	AppHandle, Manager, Runtime, WindowEvent,
};

/// Native window bridge of the distraction detector (spec §8): two frontend-polled reads,
/// no thread of its own and no Rust→frontend event channel. Kept in its own module so the
/// Win32 surface stays auditable in one file and this one keeps owning lifecycle only.
mod window_bridge;

/// Label of the single application window, as declared in `tauri.conf.json`.
const MAIN_WINDOW_LABEL: &str = "main";

/// Menu item identifiers. Kept as constants so the builder and the handler
/// cannot drift apart.
const MENU_OPEN: &str = "open";
const MENU_EXIT: &str = "exit";

/// Brings the main window back on screen and focuses it.
///
/// The three calls are all needed and none is redundant:
/// - `unminimize` in case the window was minimized to the taskbar *before* the
///   user closed it to the tray. Windows keeps that state across a `hide`.
/// - `show` because closing to the tray calls `hide`, not `close`.
/// - `set_focus` because showing a window does not raise it above the others.
///
/// Deliberately does NOT recenter: the window stays exactly where the user left it.
fn restore_main_window<R: Runtime>(app: &AppHandle<R>) {
	if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
		let _ = window.unminimize();
		let _ = window.show();
		let _ = window.set_focus();
	}
}

/// Builds the system tray icon, its context menu and their handlers.
///
/// Notes on the two non-obvious choices below:
/// - `show_menu_on_left_click(false)` is required. It defaults to `true`, which on
///   Windows makes the LEFT button open the context menu and would silently break
///   the left-click-to-restore behaviour.
/// - The icon comes from `default_window_icon()` rather than being decoded here.
///   `tauri-codegen` already embeds `icons/icon.ico` as raw RGBA at build time, so
///   reusing it needs no extra cargo feature. Decoding it in Rust instead would
///   require tauri's `image-ico`/`image-png` feature, which pulls the `image`
///   crate into `Cargo.lock` for no benefit (see rule 8 of AGENTS.md).
fn build_tray<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
	let icon = app
		.default_window_icon()
		.cloned()
		.ok_or_else(|| {
			tauri::Error::AssetNotFound(
				"no default window icon; expected src-tauri/icons/icon.ico".into(),
			)
		})?;

	// `MenuItem::with_id`, not `MenuBuilder::text`: the latter is the shared menu
	// builder macro and returns a whole `Menu`, which does not implement
	// `IsMenuItem` and therefore cannot be collected by `items()`.
	let open_item = MenuItem::with_id(app, MENU_OPEN, "Open", true, None::<&str>)?;
	let exit_item = MenuItem::with_id(app, MENU_EXIT, "Exit", true, None::<&str>)?;
	let menu = MenuBuilder::new(app).items(&[&open_item, &exit_item]).build()?;

	let tray = TrayIconBuilder::with_id("main-tray")
		.icon(icon)
		.tooltip("Pomody")
		.menu(&menu)
		.show_menu_on_left_click(false)
		// Fires for every item of every menu in the app. Only our two ids are handled.
		.on_menu_event(|app, event| match event.id().as_ref() {
			MENU_OPEN => restore_main_window(app),
			MENU_EXIT => {
				let _ = app.exit(0);
			}
			_ => {}
		})
		// On Windows a double click arrives as Click{Up} -> Click{Up} -> DoubleClick,
		// so restoring on the single Left/Up event also fires on the first click of
		// a double click. That is the accepted trade-off: the alternative is a
		// ~400ms debounce on every restore, which is worse than a redundant restore.
		.on_tray_icon_event(|tray, event| {
			if let TrayIconEvent::Click {
				button: MouseButton::Left,
				button_state: MouseButtonState::Up,
				..
			} = event
			{
				restore_main_window(tray.app_handle());
			}
		});

	// Dropping the returned handle here is safe: `build` registers the icon in the
	// app manager's tray list and in the resource table, so it outlives this scope
	// and lives for the whole process.
	tray.build(app)?;

	Ok(())
}

/// Foreground window, polled by the detector state while a focus block runs (spec §8).
///
/// Thin on purpose: the whole Win32 judgement lives in [`window_bridge`].
#[tauri::command]
fn active_window() -> Option<window_bridge::WindowInfo> {
	window_bridge::active_window()
}

/// Visible and titled top-level windows, read once when the declaration picker opens.
#[tauri::command]
fn open_windows() -> Vec<window_bridge::WindowInfo> {
	window_bridge::open_windows()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
	tauri::Builder::default()
		// MUST stay the first plugin registered. The plugin works by binding a named
		// OS mutex during `setup`, and any plugin registered before it that touches
		// the app would run before that mutex exists.
		//
		// Without this, opening Pomody again while it sits in the tray starts a SECOND
		// process with its own window, its own tray icon and its own running timer.
		// Instead, the new process forwards here and exits, and the first one raises
		// the window it already owns.
		//
		// Reuses `restore_main_window`, so this is the exact same behaviour as the
		// tray's "Open" item and its left click. No frontend involvement.
		.plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
			restore_main_window(app);
		}))
		// OS notice of the distraction detector (spec §5). Registered after the
		// single-instance plugin, which must stay first: its mutex is created during
		// `setup`, and any plugin that touches the app before that would race it.
		//
		// The version is pinned to the 2.4 minor on purpose, and it is the newest one the
		// pinned Tauri family admits: 2.5 and above require `tauri = "2.12"`, so taking them
		// would move the family (AGENTS.md rule 8). Consequence, measured and documented in
		// docs/features/distraction-detector/decisions.md §5.2: no desktop action API, hence
		// the notice is a faro and the classification gestures live in the view.
		.plugin(tauri_plugin_notification::init())
		// The two reads of the distraction detector (spec §8). Commands of the app itself
		// need no capability entry; the poll loop that consumes them is slice 5.5.
		.invoke_handler(tauri::generate_handler![active_window, open_windows])
		.setup(|app| {
			if cfg!(debug_assertions) {
				app.handle().plugin(
					tauri_plugin_log::Builder::default()
						.level(log::LevelFilter::Info)
						.build(),
				)?;
			}

			build_tray(app.handle())?;
			Ok(())
		})
		.on_window_event(|window, event| {
			// Closing the window (the X button) hides the app instead of terminating
			// it. This is the whole point of the feature: a misplaced click must not
			// kill a running focus block. `prevent_close` is what makes that possible;
			// without it the app would exit and the tray icon would die with it.
			if let WindowEvent::CloseRequested { api, .. } = event {
				api.prevent_close();
				let _ = window.hide();
			}
		})
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}