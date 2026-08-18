# dsh-provider-badge

DSH 静态客户端插件：在输入框模型选择器旁显示当前 provider 图标。

- **DeepSeek**（provider 名含 `deepseek`）→ 鲸鱼 SVG
- **OpenCode Go**（provider 名含 `opencode`，如 `opencode-go`；或为 `go`）→ 加粗连笔 "GO" 字标
- **OpenCode Zen**（provider 名恰好为 `opencode`，或含 `zen`）→ 加粗连笔 "ZEN" 字标
- **其他 provider** → 点阵首字母

图标订阅模型选择插件自己的 per-session store（`modelDirectories`），切模型即时更新；并按 composer 工具行高度等比自适应（DPI/缩放与行高变化都会跟随）。

## 安装

1. 在 DSH profile 的 `package.json` 里添加：

```json
"dependencies": {
  "dsh-provider-badge": "file:<本仓库绝对路径>"
}
```

并把 `"dsh-provider-badge"` 加入 `dsh.profile.bundles` 数组。

2. 在 profile 目录执行 `npm install`。
3. 重启 DSH。

（发布到 GitHub/npm 后，也可以用 `dsh plugin --profile web add dsh-provider-badge` 或 `github:<owner>/dsh-provider-badge` 安装。）

## 微调（改完刷新页面即可，不实时也没关系）

**永久修改**：编辑 `client/client.js` 顶部的 `TUNING_DEFAULTS`：

| 键 | 默认 | 含义 |
| --- | --- | --- |
| `iconScale` | `1` | 图标高度倍率（鲸鱼 13px、字母 10px 都乘它） |
| `yOffset` | `0` | 垂直偏移 px，正数向下 |
| `color` | `'var(--dsw-alias-label-caption)'` | 图标颜色，默认跟随主题的说明文字色（与思考等级 Max/High 同色，深浅主题自动适配）。想半透明可用 `rgba(...)`，或 `color-mix(in srgb, var(--dsw-alias-label-caption) 70%, transparent)` |

**临时实验（不改文件）**：浏览器 DevTools console 执行：

```js
localStorage.setItem('dsh-provider-badge:tuning', JSON.stringify({ iconScale: 1.1, yOffset: -1 }));
location.reload();
```

清空实验值：

```js
localStorage.removeItem('dsh-provider-badge:tuning');
location.reload();
```

修改 `client/client.js` 后刷新页面；若浏览器缓存了旧 bundle，硬刷新（Ctrl+F5）或重启 DSH。

## 结构

- `cordis.patch.yml` — 组合插入行（`provider-badge`）
- `dsh.plugin.json` — 插件元数据清单
- `lib/index.js` — host 半（空实现，本插件纯客户端）
- `client/client.js` — 浏览器半（`window.__ModuleLoader__.load` 注册，零构建、零依赖）

## 发布

本插件零构建（手写 bundle，产物直接入库），发布只需要两件事：

```bash
# 1. 打 git tag（可选但推荐：github 渠道按 commit 检测更新，tag 用于 pin 版本）
git tag v0.1.0
git push origin v0.1.0

# 2. 发布到 npm（可选：市场优先用 npm tarball，安装更快、更新按版本检测）
npm publish
```

- GitHub 仓库是基础分发渠道（`github:<owner>/dsh-provider-badge` 可直接安装）。
- npm 发布可选但推荐：dshmarket 安装时"优先 npm tarball"，且更新检测走 npm `latest` dist-tag。
- 想在插件市场（awesome-dsh-plugin.com）被搜到，还需要把仓库提交到该站点的收录清单（仓库 + npm 映射由站点 curator 维护）。
- `repository` 字段：发布前记得在 `package.json` 里补上你的 GitHub 仓库地址。
