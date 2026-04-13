use tauri::menu::{Menu, MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};
use tauri::{AppHandle, Emitter, Manager, Wry};

pub fn build_menu(app: &AppHandle) -> Result<Menu<Wry>, tauri::Error> {
    let app_menu = SubmenuBuilder::new(app, "TrustLoop")
        .item(&MenuItemBuilder::with_id("about", "About TrustLoop").build(app)?)
        .item(&MenuItemBuilder::with_id("check-updates", "Check for Updates…").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("preferences", "Preferences…").accelerator("Cmd+,").build(app)?)
        .separator()
        .item(&PredefinedMenuItem::services(app, None)?)
        .separator()
        .item(&PredefinedMenuItem::hide(app, None)?)
        .item(&PredefinedMenuItem::hide_others(app, None)?)
        .item(&PredefinedMenuItem::show_all(app, None)?)
        .separator()
        .item(&PredefinedMenuItem::quit(app, None)?)
        .build()?;

    let file_menu = SubmenuBuilder::new(app, "File")
        .item(&MenuItemBuilder::with_id("new-incident", "New Incident").accelerator("Cmd+N").build(app)?)
        .separator()
        .item(&PredefinedMenuItem::close_window(app, None)?)
        .build()?;

    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .item(&PredefinedMenuItem::undo(app, None)?)
        .item(&PredefinedMenuItem::redo(app, None)?)
        .separator()
        .item(&PredefinedMenuItem::cut(app, None)?)
        .item(&PredefinedMenuItem::copy(app, None)?)
        .item(&PredefinedMenuItem::paste(app, None)?)
        .item(&PredefinedMenuItem::select_all(app, None)?)
        .build()?;

    let view_menu = SubmenuBuilder::new(app, "View")
        .item(&MenuItemBuilder::with_id("nav-dashboard", "Dashboard").accelerator("Cmd+1").build(app)?)
        .item(&MenuItemBuilder::with_id("nav-incidents", "Incidents").accelerator("Cmd+2").build(app)?)
        .item(&MenuItemBuilder::with_id("nav-analytics", "Analytics").accelerator("Cmd+3").build(app)?)
        .item(&MenuItemBuilder::with_id("nav-integrations", "Integrations").accelerator("Cmd+4").build(app)?)
        .separator()
        .item(&PredefinedMenuItem::fullscreen(app, None)?)
        .build()?;

    let incidents_menu = SubmenuBuilder::new(app, "Incidents")
        .item(&MenuItemBuilder::with_id("new-incident-2", "New Incident").accelerator("Cmd+N").build(app)?)
        .item(&MenuItemBuilder::with_id("run-triage", "Run AI Triage").accelerator("Cmd+T").build(app)?)
        .item(&MenuItemBuilder::with_id("draft-update", "Draft Customer Update").accelerator("Cmd+U").build(app)?)
        .build()?;

    let workspace_menu = SubmenuBuilder::new(app, "Workspace")
        .item(&MenuItemBuilder::with_id("ws-settings", "Settings").accelerator("Cmd+,").build(app)?)
        .item(&MenuItemBuilder::with_id("ws-team", "Team Members").build(app)?)
        .item(&MenuItemBuilder::with_id("ws-billing", "Billing").build(app)?)
        .separator()
        .item(&MenuItemBuilder::with_id("ws-apikeys", "API Keys").build(app)?)
        .item(&MenuItemBuilder::with_id("ws-audit", "Audit Log").build(app)?)
        .item(&MenuItemBuilder::with_id("ws-sso", "SSO / SAML").build(app)?)
        .build()?;

    let window_menu = SubmenuBuilder::new(app, "Window")
        .item(&PredefinedMenuItem::minimize(app, None)?)
        .item(&PredefinedMenuItem::maximize(app, None)?)
        .build()?;

    let help_menu = SubmenuBuilder::new(app, "Help")
        .item(&MenuItemBuilder::with_id("help-docs", "Documentation").build(app)?)
        .item(&MenuItemBuilder::with_id("help-status", "Status Page").build(app)?)
        .item(&MenuItemBuilder::with_id("help-contact", "Contact Support").build(app)?)
        .item(&MenuItemBuilder::with_id("help-changelog", "Changelog").build(app)?)
        .build()?;

    MenuBuilder::new(app)
        .item(&app_menu)
        .item(&file_menu)
        .item(&edit_menu)
        .item(&view_menu)
        .item(&incidents_menu)
        .item(&workspace_menu)
        .item(&window_menu)
        .item(&help_menu)
        .build()
}

pub fn setup_menu_events(app: &tauri::App) {
    let handle = app.handle().clone();
    app.on_menu_event(move |_app, event| {
        let window = handle.get_webview_window("main");
        let emit_nav = |page: &str| {
            if let Some(ref w) = window { let _ = w.emit("navigate", page); }
        };
        match event.id().as_ref() {
            "nav-dashboard" => emit_nav("dashboard"),
            "nav-incidents" | "new-incident" | "new-incident-2" => emit_nav("incidents"),
            "nav-analytics" => emit_nav("analytics"),
            "nav-integrations" => emit_nav("integrations"),
            "run-triage" => emit_nav("triage"),
            "draft-update" => emit_nav("draft-update"),
            "preferences" | "ws-settings" => emit_nav("settings"),
            "ws-team" => emit_nav("team"),
            "ws-billing" => emit_nav("billing"),
            "ws-apikeys" => emit_nav("api-keys"),
            "ws-audit" => emit_nav("audit"),
            "ws-sso" => emit_nav("sso"),
            "help-changelog" => emit_nav("changelog"),
            "help-docs" => { let _ = open::that("https://trustloop.ai/docs"); }
            "help-status" => { let _ = open::that("https://trustloop.ai/status"); }
            "help-contact" => { let _ = open::that("https://trustloop.ai/contact-sales"); }
            "about" => {
                // Emit to frontend to show about dialog
                if let Some(ref w) = window { let _ = w.emit("show-about", ()); }
            }
            "check-updates" => {
                if let Some(ref w) = window { let _ = w.emit("check-updates", ()); }
            }
            _ => {}
        }
    });
}
