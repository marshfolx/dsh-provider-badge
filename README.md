# dsh-provider-badge

![image-20260819024142969](pics/README.zh/image-20260819024142969.png)

A client-only DSH plugin: shows the current model provider icon beside the composer model selector.

- **DeepSeek** (provider contains `deepseek`) → whale SVG
- **OpenCode Go** (provider contains `opencode`, e.g. `opencode-go`; or equals `go`) → bold merged "GO" wordmark
- **OpenCode Zen** (provider exactly `opencode`, or contains `zen`) → bold merged "ZEN" wordmark
- **other providers** → blocky initials

The badge subscribes to the model-selection plugin's per-session store (`modelDirectories`), so it updates instantly when the model changes, and scales with the composer tool-row height (DPI/zoom and row-height changes are both followed).

## Install

Install from GitHub (requires DSH):

```bash
dsh plugin --profile <profile> add github:marshfolx/dsh-provider-badge#main
```

This adds the plugin to the profile's `package.json` (`dependencies` + `dsh.profile.bundles`) and installs it. Restart DSH afterwards.

Manual equivalent — in the profile's `package.json`:

```json
"dependencies": {
  "dsh-provider-badge": "github:marshfolx/dsh-provider-badge#main"
}
```

append `"dsh-provider-badge"` to `dsh.profile.bundles`, then run `pnpm install` in the profile directory and restart DSH.

## Tuning (edit + refresh; no live reload needed)

Permanent: edit `TUNING_DEFAULTS` at the top of `client/client.js`:

| key | default | meaning |
| --- | --- | --- |
| `iconScale` | `1` | icon height multiplier (whale 13px, letters 10px) |
| `yOffset` | `0` | vertical offset in px, positive = down |
| `color` | `'var(--dsw-alias-label-caption)'` | icon color; follows the theme's caption text color (same as the effort label Max/High). For semi-transparency use `rgba(...)` or `color-mix(in srgb, var(--dsw-alias-label-caption) 70%, transparent)` |

Temporary (no file edit): in the browser console,

```js
localStorage.setItem('dsh-provider-badge:tuning', JSON.stringify({ iconScale: 1.1, yOffset: -1 }));
location.reload();
```

Clear with `localStorage.removeItem('dsh-provider-badge:tuning')`.

After editing `client/client.js`, refresh the page (hard refresh Ctrl+F5 if cached).

## Structure

- `cordis.patch.yml` — composition insert row (`provider-badge`)
- `dsh.plugin.json` — plugin manifest metadata
- `lib/index.js` — host half (empty; client-only plugin)
- `client/client.js` — browser half (`window.__ModuleLoader__.load` registration; zero build, zero deps)
