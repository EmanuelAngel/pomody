use tauri::{
	image::Image,
	menu::MenuBuilder,
	tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
	AppHandle, Manager, Runtime, WindowEvent,
};

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
/// - The icon bytes are embedded with `include_bytes!` rather than read through
///   `default_window_icon()`, so the tray icon is explicitly the same asset that
///   `tauri.conf.json` bundles.
fn build_tray<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
	let icon = Image::from_bytes(include_bytes!("../icons/32x32.png"))?;

	let open_item = MenuBuilder::new(app).text(MENU_OPEN, "Open").build()?;
	let exit_item = MenuBuilder::new(app).text(MENU_EXIT, "Exit").build()?;
	let menu = MenuBuilder::new(app).items(&[&open_item, &exit_item]).build()?;

	let tray = TrayIconBuilder::with_id("main-tray")
		.icon(icon)
		.tooltip("Pomody")
		.menu(&menu)
		.show_menu_on_left_click(false)
		// Fires for every item of every menu in the app. Only our two ids are handled.
		.on_menu_event(|app, event| match event.id().as_ref() {
			MENU_OPEN => restore_main_window(app),
			MENU_EXIT => app.exit(0),
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
	tauri::Builder::default()
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