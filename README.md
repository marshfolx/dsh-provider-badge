# dsh-provider-badge

A client-only DSH plugin: shows the current model provider icon beside the composer model selector.

- **DeepSeek** (provider contains `deepseek`) → whale SVG
- **OpenCode Go** (provider contains `opencode`, e.g. `opencode-go`; or equals `go`) → bold merged "GO" wordmark
- **OpenCode Zen** (provider exactly `opencode`, or contains `zen`) → bold merged "ZEN" wordmark
- **other providers** → blocky initials

The badge subscribes to the model-selection plugin's per-session store (`modelDirectories`), so it updates instantly when the model changes, and scales with the composer tool-row height (DPI/zoom and row-height changes are both followed).

## Install

Add to the DSH profile's `package.json`:

```json
"dependencies": {
  "dsh-provider-badge": "file:<absolute path to this repo>"
}
```

and append `"dsh-provider-badge"` to `dsh.profile.bundles`. Then run `npm install` in the profile directory and restart DSH.

(Once published, `dsh plugin --profile web add dsh-provider-badge` or `github:<owner>/dsh-provider-badge` also works.)

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

## Releasing

The plugin is zero-build (hand-written bundle, artifacts committed), so releasing is just:

```bash
# 1. git tag (optional but recommended: GitHub installs detect updates by commit; tags pin versions)
git tag v0.1.0
git push origin v0.1.0

# 2. npm publish (optional but recommended: the market prefers npm tarballs and tracks updates by the npm latest dist-tag)
npm publish
```

- The GitHub repo is the base distribution channel (`github:<owner>/dsh-provider-badge` installs directly).
- npm publishing is optional but recommended: dshmarket installs prefer npm tarballs, and update detection uses the npm `latest` dist-tag.
- To be discoverable in the plugin market (awesome-dsh-plugin.com), the repo must be submitted to their curated registry (repo + npm mapping maintained by the site).
- Remember to fill in the `repository` field in `package.json` with your GitHub URL before publishing.
