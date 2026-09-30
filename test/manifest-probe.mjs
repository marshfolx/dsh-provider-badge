/**
 * Install-contract probe: does this package still satisfy the DSH contract for a
 * `dsh.client` bundle?
 *
 * The rules checked here were read out of DSH 0.2.0-rc.2:
 *
 *   dsh-client-modules        parseDshClient / clientExportOf / bundle existence,
 *                             and `entry.registrant = options.registrant ?? fiber.name`
 *   dsh-cordis-client-runner  the browser half's accepted export shape
 *   dsh-app-boot readPluginMeta
 *                             package.json `icon` (manifest-relative path) and
 *                             `<pkg>/locale/<lang>.json` meta.title / meta.description
 *                             resolved through the package's exported resources
 *
 * Run: node test/manifest-probe.mjs      (npm test runs this with the client probe)
 *
 * Re-read the packages above after a DSH upgrade and update the rules here before
 * trusting a green run; a check that no longer matches the runtime proves nothing.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rows = [];
const ok = (n) => rows.push(['PASS', n]);
const bad = (n) => rows.push(['FAIL', n]);
const warn = (n) => rows.push(['WARN', n]);

const pkgPath = path.join(dir, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

// --- host half resolves through the package name ---------------------------
const mainRel = typeof pkg.exports?.['.'] === 'string' ? pkg.exports['.'] : pkg.exports?.['.']?.default ?? pkg.main;
mainRel && fs.existsSync(path.join(dir, mainRel))
  ? ok(`host entry resolves: exports["."] -> ${mainRel}`)
  : bad(`host entry missing: ${mainRel}`);
const hostSrc = mainRel && fs.existsSync(path.join(dir, mainRel)) ? fs.readFileSync(path.join(dir, mainRel), 'utf8') : '';
if (/export\s+function\s+apply|export\s+default|export\s*\{\s*\}/.test(hostSrc)) ok('host half uses a documented export form (apply / default / empty)');
else bad('host half exports none of the documented forms');
/\bexport\s+(const|let|var)\s+name\b/.test(hostSrc)
  ? warn('host half exports `name`, which the documented Host forms do not list')
  : ok('host half declares no undocumented `name` export');

// --- dsh.bundle.patch ------------------------------------------------------
const patchRel = pkg.dsh?.bundle?.patch;
patchRel && fs.existsSync(path.join(dir, patchRel)) ? ok(`dsh.bundle.patch present: ${patchRel}`) : bad(`dsh.bundle.patch missing: ${patchRel}`);

// --- parseDshClient --------------------------------------------------------
const decl = pkg.dsh?.client;
if (decl === undefined) bad('no dsh.client declaration');
else if (typeof decl !== 'object' || decl === null) bad('dsh.client must be an object');
else {
  typeof decl.platform === 'string' ? ok(`dsh.client.platform is a string ("${decl.platform}")`) : bad('dsh.client.platform must be a string');
  decl.platform === 'web' ? ok('platform "web" matches the web GUI carrier') : warn(`platform is "${decl.platform}", not "web"`);
  if (decl.inject === undefined) ok('dsh.client.inject omitted (allowed)');
  else if (Array.isArray(decl.inject) && decl.inject.every((s) => typeof s === 'string')) {
    ok(`dsh.client.inject is a string array (${decl.inject.length}): ${decl.inject.join(', ')}`);
    if (decl.inject.some((s) => !/^(@[^/]+\/)?[^/]+$/.test(s))) warn('an inject entry is not a bare package specifier, so it can never match a graph row');
  } else bad('dsh.client.inject must be a string array');
  if (decl.immediately !== undefined && typeof decl.immediately !== 'boolean') bad('dsh.client.immediately must be a boolean');
  else if (decl.immediately === true) ok('dsh.client.immediately: true (boot prefetch only)');
}

// --- clientExportOf + bundle existence ------------------------------------
const clientExport = pkg.exports?.['./client'];
let clientRel;
if (typeof clientExport === 'string') clientRel = clientExport;
else if (clientExport && typeof clientExport === 'object' && typeof clientExport.default === 'string') clientRel = clientExport.default;
if (clientRel === undefined) bad('exports["./client"] must be a string or { default: string }');
else {
  const abs = path.join(dir, clientRel);
  fs.existsSync(abs) ? ok(`exports["./client"] -> ${clientRel} (${fs.statSync(abs).size} bytes)`) : bad(`client bundle missing on disk: ${abs}`);
  const src = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
  const m = src.match(/__ModuleLoader__\s*\.\s*load\s*\(\s*\{\s*id:\s*["'`]([^"'`]+)["'`]/);
  m ? (m[1] === pkg.name ? ok(`bundle registers under the package name ("${m[1]}")`) : bad(`bundle id "${m[1]}" != package name "${pkg.name}"`))
    : bad('bundle does not call window.__ModuleLoader__.load({ id, factory })');
  /require\(\s*["'`]react["'`]\s*\)/.test(src) ? ok('bundle resolves React from the platform seed table') : warn('bundle never requires react');
  /exports\.name\s*=/.test(src) ? ok('client half names its fiber (reported as slot `registrant`)') : ok('client half leaves the fiber name to the package');
}

// --- display metadata (readPluginMeta) ------------------------------------
if (pkg.exports?.['./locale/*.json'] === undefined) bad('locale files are not exported (DSH resolves `<pkg>/locale/en.json` through exports)');
else ok('exports["./locale/*.json"] exposes the locale subpath');
const langs = ['en', 'zh'];
let metaOk = 0;
for (const lang of langs) {
  const f = path.join(dir, 'locale', `${lang}.json`);
  if (!fs.existsSync(f)) { if (lang === 'en') bad('locale/en.json is required for any locale metadata'); else warn(`locale/${lang}.json absent`); continue; }
  try {
    const parsed = JSON.parse(fs.readFileSync(f, 'utf8'));
    const title = typeof parsed?.meta?.title === 'string' && parsed.meta.title.trim() !== '';
    const desc = typeof parsed?.meta?.description === 'string' && parsed.meta.description.trim() !== '';
    title && desc ? metaOk++ : bad(`locale/${lang}.json needs non-empty string meta.title and meta.description`);
  } catch (e) { bad(`locale/${lang}.json is not valid JSON: ${e.message}`); }
}
if (metaOk > 0) ok(`locale meta readable for ${metaOk}/${langs.length} language(s)`);

const icon = pkg.icon;
if (icon === undefined) warn('no package.json `icon`; cards fall back to default artwork');
else if (typeof icon !== 'string') bad('icon must be a path string');
else {
  const iconAbs = path.resolve(dir, icon);
  const inside = !path.relative(dir, iconAbs).startsWith('..');
  const ext = path.extname(iconAbs).toLowerCase();
  const media = ['.svg', '.png', '.jpg', '.jpeg', '.webp'];
  if (!inside) bad('icon must stay inside the package directory');
  else if (!fs.existsSync(iconAbs)) bad(`icon file missing: ${icon}`);
  else if (!media.includes(ext)) bad(`icon media type ${ext} is not SVG/PNG/JPEG/WebP`);
  else if (fs.statSync(iconAbs).size > 256 * 1024) bad('icon exceeds the 256 KiB limit');
  else ok(`icon: ${icon} (${ext.slice(1)}, ${fs.statSync(iconAbs).size} bytes)`);
  const svg = ext === '.svg' && fs.existsSync(iconAbs) ? fs.readFileSync(iconAbs, 'utf8') : '';
  if (ext === '.svg' && /currentColor/.test(svg)) warn('icon.svg uses currentColor; an <img> load has no inherited color, so it renders as the initial colour');
}

// --- shipped files ---------------------------------------------------------
fs.existsSync(path.join(dir, 'dsh.plugin.json'))
  ? warn('dsh.plugin.json present but DSH 0.2.0-rc.2 never reads that filename')
  : ok('no dead dsh.plugin.json');
const files = pkg.files ?? [];
for (const need of ['locale/*.json', 'icon.svg']) {
  if (files.length > 0 && !files.includes(need)) warn(`package.json "files" omits ${need}`);
}

// --- dependency hygiene ----------------------------------------------------
const peers = Object.keys(pkg.peerDependencies ?? {});
peers.length === 0 ? ok('no peerDependencies (matches the shipped client-bundle template)') : ok(`peerDependencies: ${peers.join(', ')}`);
for (const p of peers) {
  if (p === 'react') warn('react is a platform module-table entry, not an installable peer');
  if (p === '@deepseek-ai/dsh-client-runtime') bad('@deepseek-ai/dsh-client-runtime no longer exists in 0.2.0-rc.2');
  if (/^@deepseek-ai\/dsh-client-/.test(p)) warn(`${p} ships with DSH; browser load ordering belongs in dsh.client.inject`);
}
for (const p of Object.keys(pkg.dependencies ?? {})) warn(`dependency ${p}: shipped DSH packages resolve from the installation`);

let failed = 0;
for (const [s, n] of rows) { if (s === 'FAIL') failed++; console.log(s.padEnd(5), n); }
console.log('\nmanifest: ' + (rows.length - failed) + '/' + rows.length + ' checks passed, ' + rows.filter((r) => r[0] === 'WARN').length + ' warnings');
process.exitCode = failed === 0 ? 0 : 1;
