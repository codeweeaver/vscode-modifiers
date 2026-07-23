# vscode-modifiers

Personal VS Code UI customization (`style.css` + `script.js`) plus a backup copy of my global VS Code settings.

## What's in here

| File | Purpose |
|---|---|
| `style.css` | Custom UI styling injected into VS Code's workbench: JetBrains Mono throughout, hidden minimap and sticky-scroll widget, rounded/blurred command palette, context menus, hover cards, notifications and suggest widget, restyled title bar, thinner scrollbar, and a custom empty-editor watermark. |
| `script.js` | Companion behavior: enforces a fixed sidebar width on startup (without blocking manual resizing afterward), adds a blur overlay behind the command palette, keeps the title bar text in sync with the active file, and animates context menus/notifications as they appear. |
| `settings.json` | Reference copy of my global VS Code `settings.json` (normally at `%APPDATA%\Code\User\settings.json`). **VS Code does not read settings from this location** — this file is a backup/history snapshot only, not live config. One block is intentionally redacted: a saved local database connection (`dbcode.connections`) for an unrelated project — host/username/database name, no password — omitted since this repo is public. |
| `keybindings.json` | Reference copy of my global `keybindings.json` (same caveat as above — not live config, just a backup). |

## How the styling gets loaded

`style.css` and `script.js` are injected into VS Code's UI by the **[Custom CSS and JS Loader](https://marketplace.visualstudio.com/items?itemName=be5invis.vscode-custom-css)** extension (`be5invis.vscode-custom-css`), wired up via this setting in the real `settings.json`:

```jsonc
"vscode_custom_css.imports": [
  "file:///C:/Users/<you>/vscode-modifiers/style.css",
  "file:///C:/Users/<you>/vscode-modifiers/script.js"
]
```

This works by patching VS Code's own `workbench.html`, which is why VS Code shows a "Your Code installation appears to be corrupt. Please reinstall." notice on startup — that's expected and safe to dismiss (Microsoft's own FAQ confirms this is a deliberate integrity check, not real corruption).

**Known limitation:** every VS Code auto-update overwrites `workbench.html`, silently wiping the patch. After any update, re-run **"Enable Custom CSS and JS"** from the Command Palette, then fully quit and reopen VS Code — a window reload alone isn't enough.

> **Planned:** migrating this setup to `subframe7536.custom-ui-style`, which backs up before patching and can reapply itself automatically after updates, instead of requiring a manual re-enable every time.

## Setting up on a new machine

1. Install VS Code and the [Custom CSS and JS Loader](https://marketplace.visualstudio.com/items?itemName=be5invis.vscode-custom-css) extension.
2. Clone this repo somewhere permanent (moving it afterward means updating the path in step 3).
3. Add to your VS Code `settings.json`:
   ```jsonc
   "vscode_custom_css.imports": [
     "file:///C:/path/to/vscode-modifiers/style.css",
     "file:///C:/path/to/vscode-modifiers/script.js"
   ]
   ```
4. Run **"Enable Custom CSS and JS"** from the Command Palette, then fully quit and reopen VS Code.
5. Optionally skim `settings.json` / `keybindings.json` in this repo for the rest of the editor config and copy over whatever's useful.
