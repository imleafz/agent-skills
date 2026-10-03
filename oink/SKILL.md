---
name: oink
description: OINK 是基于 Hugo Extended 的本地优先技术文档主题：组件用 Markdown 原生语法，字体/搜索/图表运行时随主题分发，不依赖 Node.js 与 CDN。用于创建、编写、定制与部署 OINK 文档站、博客、书籍（Book）、发布下载页与 OpenAPI 参考；覆盖 Hugo Module/Starter 安装、front matter 与页面参数、目录树即侧栏、内容与图表组件（提示块/标签页/步骤/卡片/参数表/文件树/公式/Mermaid/PlantUML/Markmap/Draw.io/ECharts/Infographic/画廊/徽章/按键/Asciinema）、品牌与站点配置、多语言/多版本/分类/搜索/命令面板/打印/Agent 输出、giscus 评论、GitHub Pages 与 Cloudflare Pages 部署、版本升级与排错。当用户提到 OINK、oink.pgsty.com、oink-starter、Hugo 文档站/主题、{.steps}/{.cards}/{.fields}、mermaid/echarts 围栏、type book、release_url、swagger/redoc shortcode、Docsy 迁移时使用。
allowed-tools: Read, Bash, Glob, Grep, Edit, Write, WebFetch, WebSearch
---

# OINK（Hugo 技术文档主题）

OINK 是一个本地优先的 Hugo Extended 主题：组件是 Markdown 语法的一部分而非另一套模板语言；浏览器需要的字体、图标、搜索与图表运行时随主题分发；消费站点只需一个 Hugo Extended 二进制，不需要 Node.js/PostCSS，也不请求 CDN。当前发布版本 **v1.1.0**。

官方文档：<https://oink.pgsty.com/zh/docs/>；源码：<https://github.com/pgsty/oink>；模板：<https://github.com/pgsty/oink-starter>。

> **自演进技能**：使用中发现指令有误、参数漂移或需要额外 workaround 时，直接修正本技能（仅针对真实可复现的问题）。
>
> 每页文档都提供 Markdown 源码：站内某页 URL 后面接 `index.md`（如 `https://oink.pgsty.com/zh/docs/components/code/index.md`）；站点索引在 `/zh/llms.txt`，文档全文包在 `/zh/docs/llms-full.txt`。本技能内容对应 v1.1.0 文档。

## 何时使用

触发场景：用 OINK 新建/改造/维护 Hugo 文档站；写页面、书、博客、发布页、OpenAPI 参考；查 front matter 或 `params.*`；查组件语法（提示块、标签页、步骤、卡片、参数表、文件树、公式、Mermaid、ECharts…）；改品牌/导航/布局/多语言/多版本/搜索/评论；部署到 GitHub Pages 或 Cloudflare Pages；从 Docsy 或旧版 OINK 升级；构建告警排错。

不适用：非 Hugo 的静态站工具（VitePress/Docusaurus/Hextra/Docsy 本身的配置）；需要 React/MDX 交互组件的文档；应用后端的开发。OINK 只产出静态站点。

## 核心模型

- **构建依赖**：Hugo **Extended** ≥ 0.160.1（官方 Starter/CI 用 0.165.0）；Hugo Module 方式需要 Go 1.27。站点不需要 npm。
- **主题进站方式**：`go.mod` 固定 `github.com/pgsty/oink` 版本（Hugo Module，推荐，可用 `go.sum` 审计）；或 submodule / 离线归档 / 固定版本克隆，此时用 `theme: oink` 引用。生产固定到发布标签，不跟随 `main`。
- **内容树 = 侧栏**：`content/` 的目录结构就是侧栏树，`_index.md` 是栏目首页，`weight`（用 10 的倍数）决定顺序。文档可放任意路径，靠 `type` + `cascade` 决定外壳。
- **组件是 Markdown 原生结构**：`> [!NOTE]` 是提示块，有序列表加 `{.steps}` 是步骤，表格加 `{.fields}` 是参数表，图片加 `{caption=}` 是图注。属性行必须紧贴块。少数组件（徽章、按键、include、asciinema、Book 图表式例）用 shortcode。
- **装饰性配置全默认关闭**：搜索、缩放、评论、反馈、分享、分析都要站点显式打开；主题不替站点决定。
- **诊断策略**：作者输入非法时预览阶段发警告并安全回退，`--panicOnWarning` 在生产构建把它变成硬失败。所以发布必须走严格构建。

## 快速参考

```bash
# 安装工具（Hugo 必须 Extended）
brew install git go hugo

# 从官方 Starter 起步（推荐）
git clone https://github.com/pgsty/oink-starter.git my-docs   # 或 GitHub 上 Use this template
cd my-docs && hugo server                                     # http://localhost:1313/

# 已有 Hugo 站点只接入主题
hugo mod init github.com/example/my-docs
hugo mod get github.com/pgsty/oink@v1.1.0

# 严格生产构建（发布门禁，必须零 WARN/ERROR）
hugo --cleanDestinationDir --gc --minify --environment production \
  --printPathWarnings --panicOnWarning

hugo mod graph | grep github.com/pgsty/oink   # 确认主题实际解析版本
```

最小 `hugo.yml` 的四段必需配置：`title`/`baseURL`/`languages`；`markup.goldmark`（三项前置：`renderer.unsafe: true`、`parser.attribute.block: true`、`parser.wrapStandAloneImageWithinParagraph: false`，另加 `highlight.noClasses: false`）；`params`；`outputs`（`home: [HTML, markdown, LLMS]`、`page: [HTML, markdown]`、`section: [HTML, RSS, print, markdown]`）与 `module.imports`。

## 路由到详细文档

| 主题 | 参考文件 |
| --- | --- |
| 依赖、Starter 分层定制、仓库导览、从零建站、四种安装方式、本地主题开发 | [references/getting-started.md](references/getting-started.md) |
| 页面写法、标题锚点、链接、目录组织、front matter 全表、博客、书籍出版、发布下载页、API 文档 | [references/authoring.md](references/authoring.md) |
| 内容类组件：提示块、图片、代码块、标签页、表格、参数表、步骤、卡片、文件树、徽章、按键 | [references/components-content.md](references/components-content.md) |
| 图表/媒体组件：公式、Mermaid、PlantUML、思维导图、Draw.io、ECharts、Infographic、画廊、引用、Asciinema | [references/components-visual.md](references/components-visual.md) |
| 站点配置 `params.*` 全表、品牌外观、首页与落地页、导航与菜单、布局与页面类型 | [references/site-configuration.md](references/site-configuration.md) |
| 功能：搜索、命令面板、键盘导航、多语言、多版本、分类体系、仓库与页面信息、打印、Agent 输出 | [references/site-features.md](references/site-features.md) |
| 本地预览、发布上线（GitHub Pages/Cloudflare Pages）、评论、分析与 SEO、版本升级、排错 | [references/admin.md](references/admin.md) |
| 设计与开发（面向主题维护者）：契约、迁移边界、诊断策略、侧栏 API、决策/研究/提案 | [references/design.md](references/design.md) |

## 工作方式建议

1. 动手前先确认工具链：`hugo version` 必须含 `extended`；改主题版本前看 `hugo mod graph`。
2. 新站点走 Starter，一次只改一层（身份 → 语言 → 首页 → 内容 → 品牌 → 集成 → 部署），每层提交一次。
3. 组件优先用 Markdown 原生形态（源码在 GitHub 上也可读）；只有原生做不到时才用 shortcode。
4. 标题写显式英文锚点 `{#id}`，双语对页用同一 ID；链接优先写站内绝对路径。
5. 每次改动后用严格构建验证，不要让 `--panicOnWarning` 失败的报告留到部署阶段。
6. 不确定某个键的默认值或某个语法的完整参数时，查对应参考文件；再不确定就取文档页的 `.md` 源码或 `llms-full.txt`。

## 维护

- 主题发新版后核对本技能；行为以官方站与 `hugo` 本机版本为准。
- 版本相关：1.0 → 1.1 的升级核对项、迁移边界、已移除的 0.4/0.5 语法见 `references/admin.md` 与 `references/design.md`。
