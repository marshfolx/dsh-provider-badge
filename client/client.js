window.__ModuleLoader__.load({ id: "dsh-ui-plugin", factory: (require) => {
var module = { exports: {} };
var exports = module.exports;
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const React = require("react");

/* ============================================================
 * provider-badge — 微调区 TUNING
 *
 * 永久修改：直接改下面的 TUNING_DEFAULTS，保存后刷新页面。
 * 临时实验（无需改文件）：浏览器 console 执行
 *   localStorage.setItem('dsh-ui-plugin:tuning', JSON.stringify({ iconScale: 1.1, yOffset: -1 })); location.reload();
 * 清空实验值：
 *   localStorage.removeItem('dsh-ui-plugin:tuning'); location.reload();
 * ============================================================ */
const TUNING_DEFAULTS = {
  iconScale: 1.2,      // 图标高度倍率（鲸鱼 13px、字母 10px 都会乘它）
  yOffset: 1,        // 垂直偏移（px，正数向下）
  color: 'var(--dsw-alias-label-caption)',  // 图标颜色：跟随主题的说明文字色（与思考等级 Max/High 同色）
};

function loadTuning() {
  let overrides = null;
  try {
    const raw = window.localStorage.getItem('dsh-ui-plugin:tuning');
    if (raw) overrides = JSON.parse(raw);
  } catch (e) { /* ignore malformed overrides */ }
  if (overrides === null || typeof overrides !== 'object' || Array.isArray(overrides)) {
    return { ...TUNING_DEFAULTS };
  }
  return { ...TUNING_DEFAULTS, ...overrides };
}

// DeepSeek whale logo (SVG path from the opencode go site)
const WHALE_PATH = 'M23.748 4.482c-.254-.124-.364.113-.512.234-.051.039-.094.09-.137.136-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.249-1.247-1.548-.352-.156-.708-.311-.955-.65-.172-.241-.219-.51-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.093.172.187.129.323-.082.28-.18.552-.266.833-.055.179-.137.217-.329.14a5.526 5.526 0 0 1-1.736-1.18c-.857-.828-1.631-1.742-2.597-2.458a11.365 11.365 0 0 0-.689-.471c-.985-.957.13-1.743.388-1.836.27-.098.093-.432-.779-.428-.872.004-1.67.295-2.687.684a3.055 3.055 0 0 1-.465.137 9.597 9.597 0 0 0-2.883-.102c-1.885.21-3.39 1.102-4.497 2.623C.082 8.606-.231 10.684.152 12.85c.403 2.284 1.569 4.175 3.36 5.653 1.858 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.133-.284 4.994-1.86.47.234.962.327 1.78.397.63.059 1.236-.03 1.705-.128.735-.156.684-.837.419-.961-2.155-1.004-1.682-.595-2.113-.926 1.096-1.296 2.746-2.642 3.392-7.003.05-.347.007-.565 0-.845-.004-.17.035-.237.23-.256a4.173 4.173 0 0 0 1.545-.475c1.396-.763 1.96-2.015 2.093-3.517.02-.23-.004-.467-.247-.588zM11.581 18c-2.089-1.642-3.102-2.183-3.52-2.16-.392.024-.321.471-.235.763.09.288.207.486.371.739.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.167-1.361-.802-2.5-1.86-3.301-3.307-.774-1.393-1.224-2.887-1.298-4.482-.02-.386.093-.522.477-.592a4.696 4.696 0 0 1 1.529-.039c2.132.312 3.946 1.265 5.468 2.774.868.86 1.525 1.887 2.202 2.891.72 1.066 1.494 2.082 2.48 2.914.348.292.625.514.891.677-.802.09-2.14.11-3.054-.614zm1-6.44a.306.306 0 0 1 .415-.287.302.302 0 0 1 .2.288.306.306 0 0 1-.31.307.303.303 0 0 1-.304-.308zm3.11 1.596c-.2.081-.399.151-.59.16a1.245 1.245 0 0 1-.798-.254c-.274-.23-.47-.358-.552-.758a1.73 1.73 0 0 1 .016-.588c.07-.327-.008-.537-.239-.727-.187-.156-.426-.199-.688-.199a.559.559 0 0 1-.254-.078c-.11-.054-.2-.19-.114-.358.028-.054.16-.186.192-.21.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.391.451.462.576.685.914.176.265.336.537.445.848.067.195-.019.354-.25.452z';

// 5x7 blocky font, square corners; '1' = filled cell
const FONT = {
  A: ['01110','10001','10001','11111','10001','10001','10001'],
  B: ['11110','10001','10001','11110','10001','10001','11110'],
  C: ['01111','10000','10000','10000','10000','10000','01111'],
  D: ['11110','10001','10001','10001','10001','10001','11110'],
  E: ['11111','10000','10000','11110','10000','10000','11111'],
  F: ['11111','10000','10000','11110','10000','10000','10000'],
  G: ['11111','10000','10000','10111','10001','10001','11111'],
  H: ['10001','10001','10001','11111','10001','10001','10001'],
  I: ['11111','00100','00100','00100','00100','00100','11111'],
  J: ['00111','00010','00010','00010','10010','10010','01100'],
  K: ['10001','10010','10100','11000','10100','10010','10001'],
  L: ['10000','10000','10000','10000','10000','10000','11111'],
  M: ['10001','11011','10101','10101','10001','10001','10001'],
  N: ['10001','11001','10101','10011','10001','10001','10001'],
  O: ['11111','10001','10001','10001','10001','10001','11111'],
  P: ['11110','10001','10001','11110','10000','10000','10000'],
  Q: ['01110','10001','10001','10001','10101','10010','01101'],
  R: ['11110','10001','10001','11110','10100','10010','10001'],
  S: ['01111','10000','10000','01110','00001','00001','11110'],
  T: ['11111','00100','00100','00100','00100','00100','00100'],
  U: ['10001','10001','10001','10001','10001','10001','01110'],
  V: ['10001','10001','10001','10001','10001','01010','00100'],
  W: ['10001','10001','10001','10101','10101','11011','10001'],
  X: ['10001','10001','01010','00100','01010','10001','10001'],
  Y: ['10001','10001','01010','00100','00100','00100','00100'],
  Z: ['11111','00001','00010','00100','01000','10000','11111'],
};

// Runtime path generation: each filled cell becomes a rect subpath that
// bleeds past its grid cell so neighboring strokes merge into bolder letters.
const PAD = 0.3;
const BLEED = 0.28;

function wordShape(word) {
  const parts = [];
  let x = 0;
  const w = (1 + 2 * BLEED).toFixed(2);
  for (let c = 0; c < word.length; c++) {
    const glyph = FONT[word.charAt(c)];
    if (glyph !== undefined) {
      for (let y = 0; y < glyph.length; y++) {
        const row = glyph[y];
        for (let i = 0; i < row.length; i++) {
          if (row.charAt(i) === '1') {
            const px = (x + i + PAD - BLEED).toFixed(2);
            const py = (y + PAD - BLEED).toFixed(2);
            parts.push('M' + px + ' ' + py + 'h' + w + 'v' + w + 'h-' + w + 'Z');
          }
        }
      }
    }
    x += 5;
    if (c < word.length - 1) x += 1;
  }
  return { width: Math.max(1, x), d: parts.join('') };
}

function WhaleIcon(props) {
  return React.createElement('svg', {
    viewBox: '0 0 24 24',
    width: props.size,
    height: props.size,
    fill: 'currentColor',
    style: { display: 'block', flex: 'none' },
    'aria-hidden': true,
  }, React.createElement('path', { d: WHALE_PATH }));
}

function BlockyWord(props) {
  const word = String(props.word || '');
  const shape = wordShape(word);
  const vw = (shape.width + 2 * PAD).toFixed(2);
  const vh = (7 + 2 * PAD).toFixed(2);
  const wpx = Math.round(props.height * (shape.width + 2 * PAD) / (7 + 2 * PAD));
  return React.createElement('svg', {
    viewBox: '0 0 ' + vw + ' ' + vh,
    width: wpx,
    height: props.height,
    fill: 'currentColor',
    shapeRendering: 'crispEdges',
    style: { display: 'block', flex: 'none' },
    'aria-hidden': true,
  }, React.createElement('path', { d: shape.d }));
}

function iconFor(provider, eff) {
  const key = String(provider || '').toLowerCase();
  if (key.indexOf('deepseek') !== -1) return React.createElement(WhaleIcon, { size: Math.round(13 * eff) });
  if (key.indexOf('opencode') !== -1 || key === 'go') return React.createElement(BlockyWord, { word: 'GO', height: Math.round(10 * eff) });
  const letters = String(provider || '').replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase();
  if (letters === '') return null;
  return React.createElement(BlockyWord, { word: letters, height: Math.round(10 * eff) });
}

// Cell that scales with the composer tool row: the first measured row height
// becomes the baseline (scale 1 = default sizes), then the glyph and cell
// follow any later row-height change. DPI/zoom already scale CSS px, so this
// tracks app-side size changes only.
function MeasuredCell(props) {
  const tuning = props.tuning;
  const ref = React.useRef(null);
  const [scale, setScale] = React.useState(1);
  React.useEffect(() => {
    const el = ref.current;
    if (el === null) return;
    let base = 0;
    const update = () => {
      const parent = el.parentElement;
      const h = parent !== null && parent.getBoundingClientRect().height >= 12
        ? parent.getBoundingClientRect().height
        : el.getBoundingClientRect().height;
      if (!(h > 0)) return;
      if (base === 0) base = h;
      setScale(h / base);
    };
    update();
    let ro = null;
    if (typeof ResizeObserver === 'function') {
      ro = new ResizeObserver(update);
      if (el.parentElement !== null) ro.observe(el.parentElement);
    }
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      if (ro !== null) ro.disconnect();
    };
  }, []);
  const eff = scale * tuning.iconScale;
  return React.createElement('div', {
    ref: ref,
    title: props.title,
    className: 'prvd-badge',
    style: {
      width: Math.round(15 * eff),
      height: Math.round(22 * scale),
      transform: 'translateY(' + (tuning.yOffset * scale).toFixed(1) + 'px)',
    },
  }, props.render(eff));
}

function LiveBadge(props) {
  const dir = props.dir;
  const tuning = props.tuning;
  const state = React.useSyncExternalStore(
    (fn) => dir.store.subscribe(fn),
    () => dir.store.getSnapshot()
  );
  const current = state != null ? state.current : null;
  if (current == null || typeof current.provider !== 'string') return null;
  const tip = current.provider + (current.model ? ' · ' + current.model : '');
  return React.createElement(MeasuredCell, { title: tip, tuning: tuning, render: (eff) => iconFor(current.provider, eff) });
}

function ProviderBadge(props) {
  const models = props.models;
  const sessionId = props.sessionId;
  const tuning = props.tuning;
  const [dir, setDir] = React.useState(null);
  React.useEffect(() => {
    if (models == null || sessionId === '') { setDir(null); return; }
    let d = null;
    try { d = models.directoryFor(sessionId); }
    catch (e) { setDir(null); return; }
    setDir(d);
    if (typeof d.available === 'function' && d.available()) {
      d.load().catch(() => {});
    }
  }, [models, sessionId]);
  if (dir === null) return null;
  return React.createElement(LiveBadge, { dir: dir, tuning: tuning });
}

function apply(ctx) {
  const slots = ctx.get('slots');
  if (slots === undefined) return;
  const tuning = loadTuning();
  const tag = document.createElement('style');
  tag.dataset.plugin = 'dsh-ui-plugin';
  tag.textContent = '.prvd-badge{display:inline-flex;align-items:center;justify-content:flex-end;width:15px;height:22px;color:' + tuning.color + ';flex:none;padding:0 1px}';
  document.head.append(tag);
  ctx.effect(() => () => tag.remove(), 'provider-badge: styles');
  const models = ctx.get('modelDirectories');
  slots.inject('conversation.input.right', () => slots.register(
    { name: 'conversation.input.right', id: 'provider-badge', order: -1 },
    (props) => {
      const sid = props.sessionId != null ? String(props.sessionId) : '';
      return React.createElement(ProviderBadge, { sessionId: sid, models: models != null ? models : null, tuning: tuning });
    }
  ));
}

exports.apply = apply;
exports.inject = ['slots'];
exports.name = 'provider-badge';
return module.exports;
}});
