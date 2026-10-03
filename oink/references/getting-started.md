# 安装、Starter 与建站方式

来源：<https://oink.pgsty.com/zh/docs/start/>（OINK v1.1.0 文档）

## 依赖

| 依赖 | 版本 | 说明 |
| --- | --- | --- |
| Hugo Extended | 兼容下限 0.160.1；官方 Starter 与 CI 验证 0.165.0 | `hugo version` 输出必须含 `extended` |
| Go | 1.27（仅 Hugo Module 方式需要） | `hugo mod` 解析与校验用 |
| Git | 任意较新版本 | 提交 `go.mod`/`go.sum`、`enableGitInfo` 需要历史 |
| Node.js | **不需要** | Bootstrap、Font Awesome、字体、搜索、图表运行时全部随主题分发，不连 CDN |

macOS：`brew install git go hugo`。Linux/Windows 按 [Hugo 安装](https://gohugo.io/installation/) 与 [Go 下载](https://go.dev/dl/) 安装，务必选 **Extended**。

## 选择起点

| 当前情况 | 推荐路径 | 得到什么 |
| --- | --- | --- |
| 新建文档站/项目站 | OINK Starter | 三语 Docs/Blog/Book 精简站点 + 两条部署 workflow |
| 已有 Hugo 站点 | 从零安装 | 不替换内容，只补主题模块与 Goldmark 前置配置 |
| 已有 Docsy 或旧版 OINK 站点 | 版本升级 | 保留内容，迁移受支持语法并审查站点覆盖 |

## 五分钟建立基线

```bash
# 1. 用 Starter 模板创建自己的仓库（GitHub 上 Use this template），或直接克隆评估：
git clone https://github.com/pgsty/oink-starter.git my-docs
cd my-docs
hugo server            # 打开 http://localhost:1313/

# 2. 首次可见修改：改 hugo.yaml 顶部站名与 baseURL，再改 data/home/en.yaml 一句话
# 3. 严格本地构建（与 workflow 相同的生产门禁）
hugo --cleanDestinationDir --gc --minify --environment production \
  --printPathWarnings --panicOnWarning
```

严格构建以 `Total in …` 结束、无 WARN/ERROR，且 `public/` 中各语言根与代表性 Docs/Blog/Book 路由都存在，才算通过。本地构建通过 ≠ 部署成功，两者独立验收。

## OINK Starter 分层定制

按顺序一次改一层，每层之间提交一次，便于回归归因。

1. **站点身份**：`hugo.yaml` 顶部标有 `CHANGE ME` 的 `title`（带 YAML 锚点，带进所有语言）与 `baseURL`；再改版权人与 `params.github_repo` / `github_branch`。
2. **语言 profile**：根配置默认英/中/法三语。要换组合，在最开始复制完整 profile（不是叠加片段）：
   ```bash
   cp examples/hugo.single.yaml hugo.yaml     # 仅英文
   cp examples/hugo.bilingual.yaml hugo.yaml  # 英文 + 中文
   ```
   未启用语言仍保留声明，Hugo 会把 `.zh.md`/`.fr.md` 识别为译文并安全忽略。要永久移除一种语言，先确认 profile 能构建，再删对应内容与首页数据。
3. **首页**：首页是数据不是模板。`data/home/en.yaml`、`zh.yaml`、`fr.yaml`，`sections` 决定顺序，`hero`/`cards`/`cta` 提供内容。先改一种语言确认，再翻译其余。
4. **内容与导航**：重写或删除 `content/` 示例叶子页；整棵表面不要时才删栏目根（`docs/`、`blog/`、`book/`）。顶部导航来自各语言栏目根的 `menus.main`。译文并排：`page.md` / `page.zh.md` / `page.fr.md`。
5. **品牌与阅读功能**：替换 `assets/icons/logo.svg` 与 `static/favicon.svg`；一次只启用一组配置：
   ```yaml
   params:
     ui:
       theme_color: '#245f94'
       typography: system
       image_zoom: true
       share: [mastodon, linkedin, email, copy]
   ```
6. **外部集成**：仓库操作、Giscus、Google Analytics、反馈、分享默认关闭/注释。必需事实（owner/repo/branch、giscus 仓库与 ID、measurement ID）齐全后再逐个启用；不完整的块保持注释。助手链接会把当前 URL 发给第三方，需显式策略选择。

## Starter 仓库导览

```filetree {title="oink-starter/"}
- oink-starter/
  - hugo.yaml                 # 身份、语言、输出、参数与模块导入
  - go.mod / go.sum           # 站点模块与精确 OINK 版本及校验和
  - examples/                 # hugo.single.yaml / hugo.bilingual.yaml 完整 profile
  - data/home/{en,zh,fr}.yaml # 每种语言一份精简落地页
  - content/                  # _index*.md、docs/、blog/、book/
  - assets/icons/logo.svg     # 经 Hugo 处理的 Logo
  - static/favicon.svg        # 原样复制到站点根
  - i18n/fr.yaml              # 站点自有界面覆盖
  - .github/workflows/        # github-pages.yaml、cloudflare-pages.yaml
```

**必须保留**：

- `go.mod` 与 `go.sum`：共同固定并校验 OINK 版本，都要提交。
- `hugo.yaml` 的三项 Goldmark 设置：原生 Steps/Cards/Fields、图片属性与 Book 目标都依赖它们。
- `outputs`：删掉 `markdown`/`LLMS`/`print` 就是有意关闭对应输出。
- workflow 的 `fetch-depth: 0`：启用 `enableGitInfo` 时「最后修改/贡献者」需要完整 Git 历史。
- CI 的 `GOWORK: off` 与 `HUGO_MODULE_WORKSPACE: off`：防止本地 workspace 替换待验证的公开版本。

主题源码不进任何站点：`go.mod` 用 Hugo Module 固定版本，解析结果存于 Go 模块缓存。`hugo mod graph | grep github.com/pgsty/oink` 看实际解析版本。

```yaml {title="hugo.yaml"}
module:
  imports:
    - path: github.com/pgsty/oink
  hugoVersion:
    extended: true
    min: '0.160.1'
```

## 从零建站（手工最小站点）

```bash
hugo new site --format yaml my-docs
cd my-docs
hugo mod init github.com/example/my-docs      # 通常就是仓库地址
hugo mod get github.com/pgsty/oink@v1.1.0     # 写出 go.mod / go.sum，都要提交
```

生产固定到发布标签，不要跟随 `main`；`@latest` 是一次性解析动作，不是版本策略。

`hugo.yml` 精简可构建配置（五段：顶层+languages / markup.goldmark / params / outputs / module）：

```yaml {title="hugo.yml"}
title: Product Docs
baseURL: https://docs.example.com/
defaultContentLanguage: en

languages:
  en:
    label: English
    locale: en-US
    weight: 1
    title: Product Docs
    params:
      description: Everything about running Product in production
    menus:
      main:
        - { name: Docs, pageRef: /docs, weight: 20 }
        - { name: Blog, pageRef: /blog, weight: 50 }

# 三项 Goldmark 前置：OINK 原生 Markdown 组件全靠它们
markup:
  goldmark:
    renderer:
      unsafe: true                              # 允许内容里的行内 HTML
    parser:
      attribute:
        block: true                             # {.steps} {.cards} {caption=} 属性行
      wrapStandAloneImageWithinParagraph: false # 块级图片才能带属性行
  highlight:
    noClasses: false                            # 代码配色跟随深浅色模式

params:
  offline_search: true
  github_repo: https://github.com/example/product-docs
  copyright:
    authors: '[Example Inc.](https://example.com/)'
    from_year: 2026
  ui:
    dark_mode: true
    sidebar_menu_foldable: true
    section_index: cards

outputs:
  home: [HTML, markdown, LLMS]
  page: [HTML, markdown]
  section: [HTML, RSS, print, markdown]

module:
  imports:
    - path: github.com/pgsty/oink
  hugoVersion:
    extended: true
    min: '0.160.1'
```

| 段 | 管什么 | 少了会怎样 |
| --- | --- | --- |
| 顶层 + `languages` | 站名、域名、语言、顶栏菜单 | `baseURL` 错，线上绝对链接全指错 |
| `markup.goldmark` | 三项组件前置 | 属性行变成正文里的一行 `{.steps}` |
| `params` | 搜索、仓库链接、外壳开关 | 交互功能默认关闭 |
| `outputs` | 每页 `.md`、`llms.txt`、打印页 | 没有「复制 Markdown」与打印视图 |
| `module` | 引用主题、声明 Hugo 下限 | 构建时找不到主题 |

放公式还需 Goldmark passthrough（见 `components-visual.md`）。

第一页：`content/` 下每个一级目录是一个分区，目录结构就是侧栏；每个文档分区至少一个 `_index.md`：

```markdown {title="content/docs/_index.md"}
---
title: Docs
linkTitle: Docs
description: Everything about running Product in production.
weight: 20
---

从[安装](/docs/install/)开始。
```

```yaml {title="content/docs/install.md"}
---
title: Install
description: Install Product on a fresh machine.
weight: 10
---

## Prerequisites {#prerequisites}

> [!IMPORTANT]
> Product 需要 PostgreSQL 18 或更高版本。
```

标题一律写显式英文锚点 `{#id}`，方便中英对齐与长期链接。预览：`hugo server` → <http://localhost:1313/>。

## 四种安装方式

除 `hugo mod vendor` 外，其余三种不建立 Go 模块，站点用 `theme: oink` 引用而非 `module.imports`，版本解析与完整性校验需自己负责。

| 方式 | 需要 Go | 版本可审计 | 主题源码进你的仓库 | 适用 |
| --- | --- | --- | --- | --- |
| **Hugo Module**（推荐） | 是 | `go.sum` 自动校验 | 否 | 默认推荐 |
| Git submodule | 否 | 仓库记录 commit | 以引用形式 | 需要主题源码在库内 |
| 离线归档 | 否 | 手工核对 checksum | 是 | 网络隔离 |
| 固定版本克隆 | 否 | 需自行记录 | 是 | 平台要求完整树 |

```bash
# Hugo Module
hugo mod get github.com/pgsty/oink@v1.1.0

# Git submodule
git submodule add https://github.com/pgsty/oink.git themes/oink
git -C themes/oink fetch --tags && git -C themes/oink checkout v1.1.0
# CI 运行 Hugo 前：git submodule update --init --recursive

# 离线归档：联网侧 hugo mod vendor 生成 _vendor/ 后整体搬入；或解压 tag 归档
hugo mod vendor
tar xzf oink-v1.1.0.tar.gz -C themes/oink --strip-components=1

# 固定版本克隆
git clone https://github.com/pgsty/oink.git themes/oink
git -C themes/oink checkout v1.1.0
```

离线分发必须保留 `LICENSE`、`NOTICE` 与 `VENDOR.json`（记录每个第三方运行时的版本、来源、许可证路径与 SHA-256）。

## 用本地主题 checkout 开发主题

主题与站点同级目录，用环境变量临时替换模块，`go.mod` 不变：

```bash
HUGO_MODULE_REPLACEMENTS='github.com/pgsty/oink -> ../oink' hugo server
```

`go.work` 是等价做法。两者只作用于本机，**不要提交**；CI 与生产用 `go.mod` 里的版本。

## 验证

```bash
hugo mod graph | grep github.com/pgsty/oink   # 主题实际解析到哪一版
hugo --gc --minify --printPathWarnings --panicOnWarning
git status --short                            # 只应有源码修改，无 public/ resources/
```

再确认：`/docs/` 打得开且侧栏有页面；顶栏搜索搜得到标题；深浅色切换后代码块配色跟随；`go.mod`/`go.sum` 在版本控制中。
