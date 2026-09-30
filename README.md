# dsh-provider-badge

![image-20260819024142969](pics/README.zh/image-20260819024142969.png)

A client-only DSH plugin: shows the current model provider icon beside the composer model selector.

- **DeepSeek** (provider contains `deepseek`) → whale SVG
- **OpenCode Go** (provider contains `opencode`, e.g. `opencode-go`; or equals `go`) → bold merged "GO" wordmark
- **OpenCode Zen** (provider exactly `opencode`, or contains `zen`) → bold merged "ZEN" wordmark
- **other providers** → blocky initials

The badge subscribes to the model-selection plugin's per-session store (`modelDirectories`), so it updates instantly when the model changes, and scales with the composer tool-row height (DPI/zoom and row-height changes are both followed).

## Requirements

Verified against DSH `0.2.0-rc.2`. The package is a `dsh.client` bundle: the host half is empty and the browser half registers through `window.__ModuleLoader__.load`, so it needs no build step. It declares no npm dependencies — React arrives from the Web platform module table, and the two browser-side packages it depends on are named in `dsh.client.inject`:

| Entry | Why |
| --- | --- |
| `@deepseek-ai/dsh-client-ui-conversation` | declares `conversation.input.right`, the slot the badge occupies |
| `@deepseek-ai/dsh-client-ui-model-selection` | provides the `modelDirectories` service the badge reads |

Shipped DSH packages resolve from the DSH installation, so neither appears in `dependencies` or `peerDependencies`.

## Install

From a local checkout, use `plugin_manager` with `action: install_bundle` and the absolute package directory as `target`. This writes the dependency plus the `dsh.profile.bundles` entry into the profile and installs it. Restart DSH afterwards.

The same package also installs by the identifier the Plugin Manager's **Add plugin** dialog expects — a package name, Git address, tarball, or absolute local path:

```bash
dsh plugin add github:marshfolx/dsh-provider-badge#main
```

## Plugin metadata

DSH reads the Plugin Manager card text and artwork from the manifest without activating the plugin:

- `package.json` `icon` → `./icon.svg` (SVG/PNG/JPEG/WebP, ≤256 KiB, inside the package directory)
- `locale/en.json`, `locale/zh.json` → `meta.title` and `meta.description`, served through the exported `./locale/*.json` subpath

Missing fields fall back to `package.json` `name` and `description`.

## Tuning (edit + reload; no live reload needed)

Permanent: edit `TUNING_DEFAULTS` at the top of `client/client.js`:

| key | default | meaning |
| --- | --- | --- |
| `iconScale` | `1.2` | icon height multiplier (whale 13px, letters 10px) |
| `yOffset` | `1` | vertical offset in px, positive = down |
| `color` | `'var(--dsw-alias-label-caption)'` | icon color; follows the theme's caption text color (same as the effort label Max/High). For semi-transparency use `rgba(...)` or `color-mix(in srgb, var(--dsw-alias-label-caption) 70%, transparent)` |

Temporary (no file edit): in the browser console,

```js
localStorage.setItem('dsh-provider-badge:tuning', JSON.stringify({ iconScale: 1.1, yOffset: -1 }));
location.reload();
```

Clear with `localStorage.removeItem('dsh-provider-badge:tuning')`.

## Updating a running install

The client half is served by the client module system and hot-reloads: when the installed `client.js` changes, the open page swaps the plugin in without a refresh (verified — a changed slot `order` became live in the page that was already open).

`package.json` metadata is read at activation and cached until restart, so changing `dsh.client.inject`, `dsh.client.immediately`, the icon, or the locale files needs a DSH restart.

pnpm installs a `file:` dependency as **hard links**, so writing a workspace file in place also changes the installed copy. Editors that replace the file instead (write a new file, rename it over) break that link and leave the installed copy stale — re-install, or restart, when in doubt.

## Checks

```bash
npm test
```

Two dependency-free probes. `test/manifest-probe.mjs` re-checks the package against DSH's install contract for a `dsh.client` bundle (manifest fields, client export, bundle registration id, locale/icon metadata, dependency hygiene). `test/client-probe.mjs` executes the real `client/client.js` against stubs of the Client services it consumes and asserts what the badge renders for each provider. Both encode the `0.2.0-rc.2` contract, so re-read the DSH packages named in their headers after an upgrade before trusting a green run.

## Structure

- `cordis.patch.yml` — composition insert row (`provider-badge`)
- `package.json` — bundle manifest: `dsh.bundle.patch`, `dsh.client`, `icon`, locale exports
- `icon.svg` — Plugin Manager artwork
- `locale/en.json`, `locale/zh.json` — Plugin Manager title and description
- `lib/index.js` — host half (`export function apply() {}`; the client half does all the work)
- `client/client.js` — browser half (`window.__ModuleLoader__.load` registration; zero build, zero deps)
- `test/manifest-probe.mjs`, `test/client-probe.mjs` — the checks `npm test` runs
