# 维护管理与发布排错

来源：https://oink.pgsty.com/zh/docs/admin/（OINK v1.1.0 文档）

站点写完之后的运维：本地预览、生产构建、发布上线、评论、分析与 SEO、版本升级、排错。前提 Hugo Extended ≥ 0.160.1，Hugo Module 方式还需 Go。OINK 消费端构建**不依赖** Node.js / npm / PostCSS；日志出现这些步骤说明混进了 Docsy 流程。任务索引：看改动→`hugo server`；出产物→严格生产构建；上线→托管商 + `baseURL`；留言→giscus；统计→分析钩子；收录→`enableRobotsTXT` + `description`；升级/迁移→版本升级 + 迁移工具；故障→排错表。

---

# 本地预览

在站点根目录（`hugo.yml` 所在）执行，打开 <http://localhost:1313/>：

```bash
hugo server
```

保存文件后重建并刷新浏览器，切分支同样触发。首次启动较慢：Hugo Module 要先经 Go 把模块下载到缓存。

| 开关 | 默认 | 说明 |
| --- | --- | --- |
| `-D` / `--buildDrafts` | 关 | 构建 `draft: true` 的页面 |
| `-F` / `--buildFuture` | 关 | 构建 `date` / `publishDate` 在未来的页面 |
| `-E` / `--buildExpired` | 关 | 构建 `expiryDate` 已过的页面 |
| `--disableFastRender` | 关 | 每次改动整站重渲染，不用增量 |
| `-M` / `--renderToMemory` | 关 | 只在内存渲染，不落 `public/` |
| `-N` / `--navigateToChanged` | 关 | 保存哪个页面浏览器就跳哪个页面 |
| `--bind` | `127.0.0.1` | 监听地址；局域网/容器外访问设 `0.0.0.0` |
| `-p` / `--port` | `1313` | 监听端口 |
| `--minify` | 关 | 预览也压缩，复现生产渲染 |
| `--printPathWarnings` | 关 | 两个页面撞同一输出路径时告警 |

本站开发组合：`hugo server -DFE --disableFastRender --renderToMemory --minify --printPathWarnings --logLevel info`（`-DFE` = `-D -F -E`，草稿/未来/过期一并构建）。改动没生效：① 加 `--disableFastRender`；② 硬刷新（`Cmd`/`Ctrl`+`Shift`+`R`）；③ 清缓存后重启。从其它设备访问时 `--baseURL` 必须写成对方可访问地址，否则 CSS 与搜索索引等绝对路径资源会指向 `localhost`：

```bash
hugo server --bind 0.0.0.0 --port 1313 --baseURL http://192.168.1.10:1313/
```

## 生产构建 {#production-build}

```bash
hugo --gc --minify --printPathWarnings --panicOnWarning
```

| 开关 | 说明 |
| --- | --- |
| `--gc` | 构建后清掉 `resources/_gen` 里不再被引用的缓存资源 |
| `--minify` | 压缩 HTML、CSS、JS、XML |
| `--printPathWarnings` | 两页撞同一输出路径时告警（多语言站点最常见的静默错误） |
| `--panicOnWarning` | 遇到第一条 WARNING 就让构建失败 |

`--panicOnWarning`：OINK 多数降级路径是告警而非报错——giscus 必填键缺失、`params.comments.type` 不支持、Hugo 弃用配置键都只打 WARNING 后跳过，CI 日志无人逐行读。本站 CI 步骤：`hugo --cleanDestinationDir --gc --minify --environment production --printPathWarnings --panicOnWarning`。`baseURL` 写在 `hugo.yml`，也可命令行覆盖；子路径部署必须带路径，**不要**用 `canonifyURLs` 修子路径（默认 `false`，保持默认）：

```yaml {title="hugo.yml"}
baseURL: https://example.com/docs/
```

构建环境用 `-e` / `--environment` 选择：`hugo` 默认 `production`，`hugo server` 默认 `development`。只有 `production` 才输出 `<meta name="robots" content="index, follow">`（否则 `noindex, nofollow`）、`robots.txt` 才为 `Allow: /`（否则 `Disallow: /`）、才渲染 Google Analytics 模板并做指纹与 SRI。预览部署用非 production：

```bash
hugo --minify --environment staging --baseURL "$PREVIEW_URL"
```

## 容器内预览

需要固定工具链或不想每台机器装 Hugo 时使用。镜像基于 `debian:bookworm-slim`，装 `hugo_extended`（`ARG HUGO_VERSION=0.165.0`）与 Go（`ARG GO_VERSION=1.27.0`，Hugo Module 需要 Go 解析下载模块），`ENTRYPOINT ["hugo"]`、`CMD ["server", "--bind", "0.0.0.0", "--disableFastRender"]`。挂载源码并顺带挂 Go 模块缓存：

```bash
docker run --rm -it -p 1313:1313 \
  -v "$PWD:/src" -v "$HOME/go/pkg/mod:/root/go/pkg/mod" oink-hugo

# 生产构建（必须映射用户 ID，否则 root 写的 public/ 宿主机删不掉）
docker run --rm --user "$(id -u):$(id -g)" -v "$PWD:/src" oink-hugo --gc --minify
```

## 清缓存 {#clean-caches}

| 目录 / 命令 | 内容 | 什么时候清 |
| --- | --- | --- |
| `public/` | 上次构建产物 | 删了页面但线上还在；或 `hugo --cleanDestinationDir` 让构建自清 |
| `resources/_gen/` | 处理过的图片与编译出的 CSS | 换了图片处理参数/字体/主色，页面还是旧样子 |
| `hugo mod clean` | Hugo Module 缓存 | 换了主题版本但解析出来还是旧的；`--all` 清整个模块缓存 |

```bash
rm -rf public resources/_gen
hugo mod clean          # 只清当前项目用到的模块
hugo mod clean --all    # 清整个模块缓存，下次构建重新下载
```

`public/` 与 `resources/` 都应写进 `.gitignore`。

## 与主题一起改 / 断网验证

用 `HUGO_MODULE_REPLACEMENTS` 把模块临时指向本地 checkout，`go.mod` 不变：

```bash
HUGO_MODULE_REPLACEMENTS='github.com/pgsty/oink -> /absolute/path/to/oink' hugo server
```

本站 `Makefile`（要求主题 checkout 在同级 `../oink`）：`make dev`、`make check`（跑完整 `npm test`）、`make build`（用 `go.mod` 版本）、`make serve`（生产配置预览）。**替换只作用于本机**：无论环境变量还是 Go workspace（`go work init` + `HUGO_MODULE_WORKSPACE=go.work`），CI 与生产构建都只看 `go.mod`，`go.work` 不能提交；判定发布标签是否可用时去掉替换、用 `go.mod` 版本单独构建。

断网验收覆盖构建与浏览器两阶段：① 从已校验主题归档与空模块缓存开始（`hugo mod clean --all`）；② 阻断出站 HTTP/HTTPS 与 Go proxy；③ 跑生产构建；④ 浏览两种语言的文档页/博客页/首页/404；⑤ 操作搜索、深浅色、图表与组件；⑥ 检查子资源来源。最后用主题仓库脚本扫描（不依赖站点测试框架）：

```bash
python3 bin/check-output-security.py \
  --public public --base-url https://docs.internal.example.com/
```

脚本扫四种输出里每个 `href` / `src` / `srcset` / `poster` 与表单 `action`，要求是站内相对或 `http` / `https` / `mailto` / `tel`，拒绝行内 `on*` 与 `javascript:` URL；指向别的主机的 `<iframe>` `<script>` `<link>` `<img>` `<video>` `<audio>` `<embed>` `<object>` `<source>` 一律报错，确需第三方加 `--third-party` 放行，多域名语言用 `--allow-host` 追加首方主机。每个候选版本、每次依赖更新后都要重跑。

## 构建验证 {#verify}

```bash
rm -rf public resources/_gen
hugo --gc --minify --printPathWarnings --panicOnWarning
```

看到 `Total in …` 且无 ERROR / WARNING 才算通过。再确认：日志里没有 npm、PostCSS、Autoprefixer 或下载浏览器资源的步骤；`public/` 下有 `sitemap.xml` 与 `robots.txt`（后者为 `Allow: /`）；开了本地搜索的站点 `public/` 根下有 `offline-search-index.<语言>.json`；`hugo server` 打开文档页、博客页、首页、404，两种语言两种配色都看。

---

# 发布上线

产物是纯静态目录，任何静态托管都能部署，不需 Node 运行时、SSR 或构建插件。托管商一侧只有三件事：用正确的 Hugo 版本执行一条命令、发布 `public/`、让 `baseURL` 与最终访问地址一致。

## baseURL {#baseurl}

最常见故障源：页面能打开，但搜索索引 404、页面操作链接指向错误位置、部分资源加载失败。判断是否配对看搜索索引请求路径——浏览器应去 `<baseURL>/offline-search-index.zh.json` 取索引，取到别处就是 `baseURL` 不对。

```yaml {title="hugo.yml"}
baseURL: https://example.com/docs/    # 子路径必须写进 baseURL
```

```bash
hugo --gc --minify --baseURL "https://example.com/docs/"
```

## 托管商 {#hosts}

**GitHub Pages** — 构建在 Actions 执行，产物经 Pages 部署 API 发布，不需 `gh-pages` 分支；OINK Starter 内置 `.github/workflows/github-pages.yaml`。关键点：

- `permissions`: `contents: read` / `pages: write` / `id-token: write`；`concurrency.group: github-pages`。
- `env`: `HUGO_VERSION: 0.165.0`、`GOWORK: off`、`HUGO_MODULE_WORKSPACE: off`（防本地 `go.work` 参与 CI，保证验证 `go.mod` 固定的公开标签）、`HUGO_CACHEDIR: ${{ github.workspace }}/.hugo_cache`。
- `actions/checkout@v7` 带 `fetch-depth: 0`：开了 `enableGitInfo` 时「最后修改时间」与贡献者信息要读完整历史，浅克隆会为空。
- `actions/setup-go@v7`（`go-version-file: go.mod`，`cache-dependency-path: go.sum`）+ `go mod download github.com/pgsty/oink`：Hugo Module 需要 Go。submodule 安装改 `submodules: recursive`；离线归档把 `themes/oink/` 提交进仓库，这两步可去掉。
- `actions/configure-pages@v6` 后构建：`hugo --cleanDestinationDir --gc --minify --environment production --printPathWarnings --panicOnWarning --baseURL "${{ steps.pages.outputs.base_url }}/"`（项目站点 URL 形如 `https://<OWNER>.github.io/<REPO>/`，由 `configure-pages` 算出，别手写）。
- `actions/upload-pages-artifact@v5`（`path: public`）→ `actions/deploy-pages@v5`。

仓库 Settings → Pages → Build and deployment 把 Source 设为 **GitHub Actions**，推一次 `main`。自定义域名在同页 Custom domain 填写并配 DNS，随后把 `baseURL` 换成该域名；需要产物带 `CNAME` 就放进 `static/CNAME`。

**Cloudflare Pages** — OINK Starter 内置 `.github/workflows/cloudflare-pages.yaml`，使用 Direct Upload（严格构建留在 GitHub Actions，Wrangler 上传同一份 `public/`）：

1. 创建 **Direct Upload** 的 Pages 项目；项目名默认与仓库相同，可用仓库变量 `CLOUDFLARE_PROJECT_NAME` 覆盖。
2. 添加仓库 secrets：`CLOUDFLARE_ACCOUNT_ID` 与 `CLOUDFLARE_API_TOKEN`（token 需 **Account → Cloudflare Pages → Edit** 权限）。
3. 手动运行一次 **Deploy to Cloudflare Pages**；设置仓库变量 `CLOUDFLARE_PAGES_ENABLED=true` 后每次推 `main` 才自动部署。
4. 规范 URL 默认 `https://<project>.pages.dev/`；自定义域名成为生产地址时设置 `CLOUDFLARE_SITE_URL`。

workflow 固定 Hugo Extended 0.165.0，从 `go.mod` 读 Go 版本，关闭本地模块 workspace，上传前用 `--panicOnWarning` 构建。Git integration 是另一种有效模式：构建命令 `hugo --gc --minify --printPathWarnings --panicOnWarning`，输出目录 `public`，Hugo 固定 `0.165.0`，Go 固定 `1.27`；同一项目只用其中一种。

**Netlify / Vercel** — 构建命令 `hugo --gc --minify --printPathWarnings --panicOnWarning`，发布目录 `public`，环境变量 `HUGO_VERSION`：

```toml {title="netlify.toml"}
[build]
command = "hugo --gc --minify --printPathWarnings --panicOnWarning"
publish = "public"

[build.environment]
HUGO_VERSION = "0.165.0"
```

**Nginx / Caddy** — 把 `public/` 内容整个铺上去，`try_files $uri $uri/ =404`、`error_page 404 /404.html`，纯静态无转发路径。**对象存储** — `hugo.yml` 写 `deployment.targets[].name/URL/cloudFrontDistributionID`，构建后 `hugo deploy` 只上传变化文件（`--dryRun` 先看）；前提 `hugo version` 带 `withdeploy`，云凭据由标准环境变量或配置文件提供。**离线打包** — 联网机器 `hugo --gc --minify --baseURL "..."` 后 `tar -czf oink-site-$(date +%Y%m%d).tar.gz -C public .`，目标机解压到 Web 根；构建时就要用目标 `baseURL`，绝对链接不能在解包后再改。**托管商没有 Go** — Hugo Module 需构建环境有 Go，不提供就改 Git submodule（构建前 `git submodule update --init`）或离线归档。

## 预览部署不要被收录 {#preview-builds}

```bash
hugo --gc --minify --environment staging --baseURL "$PREVIEW_URL"
```

非 production 产物自带 `noindex, nofollow` 与 `Disallow: /`，也不上报分析。

## 内容安全策略 {#csp}

主题自带运行时、字体、图标都是同源资源，严格 CSP 可行；主题不提供通用策略。五处会改变所需指令：作者写的行内 HTML / 脚本（`renderer.unsafe: true` 下由作者负责）；ECharts 的 `$fn:` 回调（注册脚本来源进 `script-src`）；分析脚本（脚本与上报目标）；远程 API 规范与自建图表服务（`connect-src` / `img-src`）；giscus（`script-src` 与 `frame-src` 一起放行）。从覆盖已审查功能的最小策略起步逐项放行。

## 验收清单 {#checklist}

| 检查 | 怎么确认 |
| --- | --- |
| 零告警构建 | 命令带 `--printPathWarnings --panicOnWarning`，日志有 `Total in …` |
| `baseURL` 正确 | 源码 `<link rel="canonical">` 指向真实生产地址（含子路径） |
| 站点地图 | `<baseURL>/sitemap.xml` 可访问；多语言是一个索引，指向 `/en/sitemap.xml`、`/zh/sitemap.xml` |
| robots | `<baseURL>/robots.txt` 是 `Allow: /` 并带 `Sitemap:` 行；预览应为 `Disallow: /` |
| 搜索索引 | 浏览器能取到 `<baseURL>/offline-search-index.<语言>.json`，站内搜索有结果 |
| Markdown 输出 | 任一页面 URL 后加 `index.md` 能取到纯文本（`outputs.page` 开了 `markdown` 时） |
| `llms.txt` | `outputs.home` 开了 `LLMS` 时，首要语言与每种已启用语言根都能访问 |
| 已启用语言 | 每种语言的文档页、博客页、首页都能打开，语言切换落到对应页面而非首页 |
| 外观与交互 | 深浅色切换、打印视图、代表性组件（提示块、标签页、代码块复制）正常 |
| 404 | 访问不存在的路径，看到站点自己的 404 页 |

## 回滚 {#rollback}

静态站点回滚就是重新发布上一个已知可用的 commit，不要在生产上手工改文件。GitHub Pages：Actions 里找到上次成功的 `Deploy to GitHub Pages` 点 Re-run all jobs，或 `git revert` 后重推。Cloudflare Pages / Netlify / Vercel：部署列表里选上一个成功部署，用平台 Rollback / Publish deploy 重设生产版本。自建服务器：保留上一份 `tar.gz` 解压覆盖。问题出在主题升级时回滚 `go.mod` 固定版本。

---

# 启用评论（giscus）

每个页面对应一条 GitHub Discussion，读者用 GitHub 账号登录发言，维护者在 GitHub Discussions 审核。主题不提供自建后端，也不内置 giscus 以外的服务商。前提是公开 GitHub 仓库（私有仓库 Discussions 访客读不到）。

> 启用评论的页面会从 `https://giscus.app` 加载脚本与 iframe，网络隔离环境用不了；默认关闭，只在显式打开时加载。站点有隐私政策时应写入这条外部数据边界。

准备：① 选一个公开仓库放评论线程（可就是站点仓库）；② 仓库 Settings → General → Features 勾选 Discussions；③ 安装 [giscus GitHub App](https://github.com/apps/giscus)；④ 选 Discussion 分类，推荐 **Announcements**（只有维护者与 giscus bot 能新建）。仓库 ID 与分类 ID 是公开标识符不是凭据；**不要**往配置里放 personal access token、OAuth secret 或密码。

在 [giscus.app](https://giscus.app/zh-CN) 填表生成 `<script>`，四个属性对应 OINK 键：`data-repo` → `repo`、`data-repo-id` → `repoId`、`data-category` → `category`、`data-category-id` → `categoryId`。

```yaml {title="hugo.yml"}
params:
  comments:
    enable: true
    type: giscus
    giscus:
      repo: pgsty/oink.pgsty.com
      repoId: R_kgDOTzFZAg
      category: Announcements
      categoryId: DIC_kwDOTzFZAs4DDCm-
      mapping: pathname
      inputPosition: bottom
      theme: auto
      loading: lazy
```

四个键缺一不可：任一缺失或只有空白字符，Hugo 打一条 WARNING 并跳过 giscus，构建不失败——所以生产构建要带 `--panicOnWarning`。`type` 只接受 `giscus`，写别的值同样告警加跳过。`params.comments` 键名与 Hextra 同形，可直接迁配置。`mapping` 决定哪个页面对应哪条 Discussion，默认 `pathname`；开始收集评论后再改 `mapping` 或移动页面会找不到已有评论（评论不被删，但页面找不到），映射方式要上线前定好，确实改 URL 时同时保留重定向或重命名 Discussion。其余键（`strict`、`reactionsEnabled`、`emitMetadata`、`term`、`lang`、`lightTheme`、`darkTheme`、`ariaLabel`、`errorMessage`）都有默认值；功能开关可写 YAML 布尔值或 giscus 风格 `0` / `1`。

按页开关：front matter 的 `comments` 从任一方向覆盖全站开关，离页面最近的值优先（`comments: true` / `comments: false`）。整个栏目用 cascade：

```yaml {title="content/docs/_index.zh.md"}
---
title: OINK 文档
cascade:
  type: docs
  comments: true
---
```

同时配了 `services.disqus.shortname` 时 giscus 优先：giscus 生效即抑制 Disqus，`comments: false` 同时关掉两者，giscus 必填键不全则告警跳过、由 Disqus 兜底。界面语言自动跟随当前 Hugo 语言（简繁/香港繁体分别映射，不支持的回退英文），只有自动选择不合适才显式设 `lang`；需要翻译的是 OINK 一侧 `ariaLabel` 与 `errorMessage`，按语言配置并与全局仓库配置合并，语言层只写差异。`theme: auto` 时 iframe 跟随 OINK 深浅色切换与浏览器 `prefers-color-scheme`；更贴合站点配色用 `lightTheme` / `darkTheme` 分别指定 giscus 内置主题名或站点自托管 CSS（如 `/css/giscus-oink-light.css?v=0.4.0`），`theme` 写成固定主题名时不再跟随；自托管 CSS 需 CORS 允许（本站本地预览在 `server.headers` 加 `Access-Control-Allow-Origin: '*'`，线上由托管商决定）。OINK 不索取或保存密码令牌；评论脚本是同源资源只加入启用评论的页面；`loading: lazy` 时滚动到附近才加载。严格 CSP：

```text
script-src 'self' https://giscus.app;
frame-src 'self' https://giscus.app;
```

脚本加载失败或没创建 iframe 时显示 `errorMessage`，不会停在「加载中」。验证：

```bash
hugo --minify --panicOnWarning     # 必填键缺失会在这里失败
hugo server --disableFastRender
```

确认：① 应有评论的页面底部出现 giscus、显示「使用 GitHub 登录」、语言正确；② 切换深浅色评论区跟着变；③ `comments: false` 的页面既无 giscus 也无其它评论组件；④ 发测试评论后回 GitHub 看指定分类下是否出现对应 Discussion。首次创建 Discussion 前控制台提示「找不到 Discussion」属正常。出错按序查：构建日志 WARNING（四个必填键）→ `params.comments.enable` 与 `type` → front matter `comments` → 仓库公开/Discussions/giscus App → 控制台与响应头（CSP 是否拦 `giscus.app`）。

---

# 分析与 SEO

主题默认不加载任何分析、表单或广告脚本，不配置就没有对外请求。SEO 一侧相反：canonical、hreflang、`robots` meta、Open Graph 与 Twitter 卡片由主题逐页生成，需要你做的是把 `baseURL` 与每页 `description` 写对。

接 Google Analytics 用 Hugo 内置服务配置，填 GA4 measurement ID；主题只在 production 渲染该脚本，本地预览与预览部署不上报，不需另加开关：

```yaml {title="hugo.yml"}
services:
  googleAnalytics:
    id: G-6JLQEHYFQG
```

**不要**同时设置已弃用的顶层 `googleAnalytics` 键；不需要分析时删掉整段配置，不要填假 ID（严格同源 CSP 需为它放行）。Plausible、Umami、Matomo 这类只要求插入脚本的服务用两个注入点（站点仓库建同名文件，不改主题）：

| 文件 | 插入位置 | 适合放什么 |
| --- | --- | --- |
| `layouts/_partials/hooks/head-end.html` | `</head>` 之前，在 Google Analytics 模板之前 | 分析脚本、cookie 同意脚本、主题没提供的 meta |
| `layouts/_partials/hooks/body-end.html` | 页面脚本的最后 | 只影响交互、不影响首屏的第三方代码 |

```go-html-template {title="layouts/_partials/hooks/head-end.html"}
{{ if hugo.IsProduction }}
<script defer data-domain="oink.pgsty.com"
        src="https://plausible.io/js/script.js"></script>
{{ end }}
```

`hugo.IsProduction` 这层不要省，否则每个人的本地预览都会向统计上报。head-end 在 GA 之前执行是有意的：cookie 同意脚本必须先于分析脚本。

`<meta name="description">` 按顺序取第一个非空：① front matter `description`；② Hugo 计算的 `.Summary`；③ 站点 `params.description`。每页写一句 `description` 是唯一需要作者做的 SEO 动作，同时用于搜索引擎摘要、栏目首页卡片副标题、站内搜索结果预览。多语言站点每种语言各写一句：

```yaml {title="hugo.yml"}
languages:
  en:
    params:
      description: A Hugo theme for engineering docs
  zh:
    params:
      description: 为工程而设计的 Hugo 文档主题
```

canonical 与 hreflang 由主题逐页输出、不需配置：语言代码来自各语言 `locale`（本站 `en-US` / `zh-CN`），链接来自 Hugo 译文关系；找不到译文时回退到目标语言首页（预期行为，也是译文关系是否被认出的探针）。canonical 由 `baseURL` 拼出，配错会把搜索引擎指向不存在的地址。社交卡片调用 Hugo 内置 Open Graph 与 Twitter 模板，标题/描述/URL/语言/站名自动；分享带图用 front matter `images`，全站兜底图写 `params.images`，有图时 `twitter:card` 从 `summary` 变 `summary_large_image` 并多出 `og:image` 与 `twitter:image`。

站点地图与 robots：

```yaml {title="hugo.yml"}
sitemap:
  changefreq: monthly
  filename: sitemap.xml
  priority: 0.5

enableRobotsTXT: true
```

多语言生成一个 `sitemap.xml` 索引，指向 `en/sitemap.xml`、`zh/sitemap.xml`；站点级默认与页面级 `sitemap.priority` 覆盖都是 Hugo 原生，`changefreq` / `priority` 是提示不是承诺，值得做的是发布前确认草稿、私有内容与非规范副本没进地图。`robots.txt` 由主题模板按环境生成：production 是 `Allow: /` 并带 `Sitemap:` 行，非 production 是 `Disallow: /`；页面 `robots` meta 跟同一开关（production 且非打印输出时 `index, follow`，否则 `noindex, nofollow`）。主题没有按页 `noindex` 开关：不该被收录就不发布（`draft: true` 或 Hugo `_build`），既要发布又不想收录就用 `head-end.html` 自己输出。

收录检查（上线一两周后）：① 访问 `<baseURL>/robots.txt` 确认是 `Allow: /`；② 访问 `<baseURL>/sitemap.xml` 点进语言子地图看数量；③ 查 `site:你的域名` 数量级；④ 搜索结果应落在 canonical 指向的 URL；⑤ 在 Google Search Console / Bing Webmaster Tools 提交 `sitemap.xml`。验证：

```bash
hugo --gc --minify --printPathWarnings --panicOnWarning
grep -o '<link rel="canonical"[^>]*>' public/zh/docs/admin/analytics/index.html
grep -o '<meta name="robots"[^>]*>' public/zh/docs/admin/analytics/index.html
cat public/robots.txt
grep -rl 'googletagmanager\|gtag(' public/ | head   # 没接分析时不应有输出
```

---

# 版本升级

升级 OINK 是换一个固定模块版本，再确认站点仍能零告警构建；升级会改变渲染结果，先建升级分支再动手。升级前先读目标版本发布注记：本站项目博客 release 系列、GitHub [Releases](https://github.com/pgsty/oink/releases)。生产站点固定已发布标签或主动选定的不可变 commit，不跟随分支，也不用 `@latest`：

```bash
hugo mod get github.com/pgsty/oink@v1.1.0   # 已发布的版本标签
hugo mod tidy
hugo mod graph | grep github.com/pgsty/oink
```

`go.mod` 应含 `require github.com/pgsty/oink v1.1.0`（`go 1.27.0`）。主动选定的不可变 commit 通常记录为 Go 伪版本，只要解析到预期提交就是有效固定，但不能作为某命名版本已发布的证据。Git submodule 方式先确认无本地修改，再 `git -C themes/oink fetch origin --tags`、`git -C themes/oink checkout --detach v1.1.0`、`git add themes/oink`；离线归档/克隆用选定版本完整内容替换 `themes/oink/`，确认 `theme:` 与目录名一致。

> `make dev` 和 `make check` 只对当前命令设置 `HUGO_MODULE_REPLACEMENTS`，使用同级 checkout；判定发布标签是否可用时用不带替换的 `make build`，否则验证的是本地代码。

升级后必做：

```bash
rm -rf public resources/_gen
hugo --gc --minify --printPathWarnings --panicOnWarning --logLevel info
```

`--logLevel info` 含信息级诊断，`--panicOnWarning` 将警告视为失败；升级 Hugo 前先处理当前固定版本的弃用提示。构建通过后人眼再过：首页、一个文档页、一个博客页、404、两种语言、两种配色、打印视图以及站点自己定制的地方。

## 从 1.0 升到 1.1 {#from-1-0}

> OINK 1.1.0 升级清单：各消费站仍需更新依赖固定版本、重新构建和部署；主题发布不会自动升级既有站点。从 1.0.0 升级不需要迁移源码。Hugo Extended 0.160.1 仍是下限，CI 固定 0.165.0，Go 1.27.0 声明与 1.0.0 相同。Hugo 0.160.x 上，非默认通用 `zh` 与区域中文目录并存时需配置 `locale: zh-CN`。

| 范围 | 1.1 行为与升级检查 |
| --- | --- |
| 语言 | 32 份界面目录原生消息结构相同。检查语言标签、复数计数与 RTL 方向；正文译文仍由站点负责 |
| 分类法 | 根页变成术语卡片目录并提供分类法切换器。检查分类法模板/CSS 覆盖、作者头像与本地化面包屑 |
| 侧栏 | 缓存树保留页面有效设置，无 JS 也可用。检查折叠、悬停恢复、移动抽屉与键盘焦点，隐藏内容必须退出焦点顺序 |
| 分组 | `sidebar_divider: true` 保留分区子文档。仅在明确不发布分组自身输出时加 `build.render: never`；检查子导航、面包屑、翻页、Print 与 Book 目录 |
| 根菜单 | 显式 `sidebar_root_menu: false` 对自根分区也生效；当前可链接的根仍作为位置标记显示 |
| 自定义脚本 | 若还需支持 1.0.0，先检测 `OinkSidebar` 与 `OinkCommandPalette.registerSearchTail`。通过 API 恢复分支状态，不要直接改 class 或 ARIA 属性 |
| 文章复制 | 启用图片缩放时以纯文本与富文本 HTML 复制图片和图注。预览提示不得进入复制内容，缩放与键盘操作仍需正常 |
| Print 与 Redoc | 检查单页和 Book 聚合 Print、标题与标签页链接，以及真实部署前缀下的本地 Redoc 规范；本地规范路径相对于 `static/` |

`params.ui.image_zoom` 与 `params.offline_search` 仍默认关闭；新搜索钩子不启用远程服务也不加查询遥测；`params.ui.scroll_spy` 与页面级 `scroll_spy` 在 1.x 中仍作为 no-op 接受。将受影响的站点级主题副本与新实现比较后再更新或移除，保留旧图片缩放脚本或侧栏 partial 会让站点无法获得上游修复。验证本地修改用 `make check` / `make browser` / `make dev`；验收正式版本时固定已发布标签、无模块替换构建并验证部署后的页面。

## 内容迁移工具 {#migration-toolkit}

0.4 的一批 shortcode 已换成当前 Markdown 原生形态，主题仓库带了一个只依赖 Python 标准库的工具：

```bash
git clone https://github.com/pgsty/oink && cd oink

# 1. 只读盘点：一次看多个站点要改什么，可导出 Markdown / JSON 报告
python3 bin/migrations/oink06.py report --sites ~/pgsty/oink.pgsty.com ~/www/ddia --md report.md
# 2. 干跑：打印每个文件的 diff 与计数，不写任何东西
python3 bin/migrations/oink06.py migrate --site ~/pgsty/oink.pgsty.com
# 3. 真改：原子写入
python3 bin/migrations/oink06.py migrate --site ~/pgsty/oink.pgsty.com --write
# 4. 查残留：还有旧语法就退出码 1
python3 bin/migrations/oink06.py check --site ~/pgsty/oink.pgsty.com
```

- 干跑是默认行为，只有 `--write` 才落盘；先干跑、读 diff、再写。
- 重跑一次应该零改动；第二次 `--write` 还报改动说明转换不收敛，停下看那几个文件。
- 围栏里的文字不动，示范旧写法的代码块不会被误伤。
- 表达不了的构造原样保留并附 `file:line` 与原因，作为手工处理清单，不是失败。
- 只想先转某一类用 `--only`：`python3 bin/migrations/oink06.py migrate --site ~/www/ddia --only callout,tabs --write`。

改完重新构建（带 `--panicOnWarning`）并逐页看渲染结果：工具保证语法正确，不保证语义符合预期。

## 0.4 → 当前语法映射 {#syntax-map}

| 0.4 的写法 | 当前写法 | `--only` 键 |
| --- | --- | --- |
| `{{% alert color= title= %}}`、`{{% details %}}`、`{{% pageinfo %}}`、手写 `<details><summary>` | `> [!TYPE] 标题` / `> [!DETAILS]-` | `callout` |
| `{{< tabpane >}}` + `{{% tab header= %}}`、`{{< code-group >}}` + `{{< code-tab >}}` | 相邻围栏加 `{tab= group= value=}`；正文型标签页用 `{{< tabs >}}` + `{{< tab >}}` | `tabs` |
| `{{< filetree >}}` 与 `filetree/folder`、`filetree/file` | `filetree` 数据围栏 | `filetree` |
| `{{< gallery >}}` 与 `gallery/image` | `gallery` 数据围栏 | `gallery` |
| `{{< echarts >}}`、`{{< infographic >}}` | 同名数据围栏（`$fn:` 不变，`js` 子围栏要到 `window.OinkEchartsFunctions`） | `datafence` |
| `doc-cards` / `doc-card`、`nav-cards` / `nav-card`、`card` / `cardpane`、`doc-carousel` | `{{< cards >}}` + `{{< card >}}`，或链接列表加 `{.cards}` | `cards` |
| `{{< imgproc >}}`、`{{< image >}}` | `![alt](src)` 加属性行 `{command= options= caption=}` | `image` |
| `{{< readfile file= >}}` | `{{< include file= >}}` | `include` |
| 围栏属性 `{filename="x"}` | `{title="x"}` | `fencetitle` |
| `{{< badge outline= >}}` | 去掉 `outline` 参数 | `badge` |
| `{{< example >}}` + 围栏、`{{< book-figures kind="tbl" >}}` | `{{< eg >}}…{{< /eg >}}`、`{{< book-tables >}}` | `eg` |
| `{{% _param x %}}`、`iframe`、`conditional-text`、`blocks/*`、`netlify`、不带 kind 的 `xref` | 工具只报告，需要手工处理 | `reportonly` |

## 从 Docsy 迁移 {#from-docsy}

OINK 是 Docsy 的硬分支：内容模型、`td-` 命名、Sass 变量、大部分 front matter 都还在。迁移核心是删掉站点里复制的公共外壳让主题实现接管，而不是重写正文：

1. 固定目标版本（`go.mod` 换 OINK 发布标签，或完整版本化归档；评估期可用不提交的 `go.work`）。
2. 清点覆盖项：把 `layouts/`、`assets/`、`static/` 下每个站点级文件归成四类——公共外壳副本（验证后删）、OINK 已提供的组件（删或机械重命名）、品牌定制（保留缩到最小 hook）、业务专属数据与交互（留站点）。按引用关系删，不要清空 `layouts/`。
3. 搬配置：`title`、`languages.*`、`github_repo`、`github_branch`、`page_width`、`params.ui.*` 留在原语义位置。Docsy 驼峰检索键已改名，一律改下划线：`offlineSearch`、`offlineSearchIndex`、`offlineSearchMaxResults`、`offlineSearchOnServe`、`offlineSearchSummaryLength`（旧键只是没人读的键，检索会静默保持关闭）。
4. 字体与样式的兼容点：`assets/scss/_variables_project.scss` 里 Docsy Sass 变量仍生效，作为字体角色种子值——`$td-fonts-serif`、`$font-family-sans-serif`、`$headings-font-family`、`$font-family-code` 各喂对应角色；`$td-enable-google-fonts`、`$td-google-font-name`、`$td-web-font-path` 主题已不读取，留着不影响构建也不产生效果；OINK 自带 Inter、Chakra Petch、IBM Plex Mono，任何预设都不向 Google Fonts 发请求。想换字体走 token 层。
5. 换 shortcode：Docsy 的 `alert`、`pageinfo`、`tabpane`、`card` 系列都有当前形态，用迁移工具批量转，`--only` 一类一类来。
6. 一次删一组、每组构建一次。在临时副本演练并记录主题 commit、Hugo 版本、删了哪些文件、产出多少 HTML，确认等价后再在生产分支重做。

第 2 步「验证后删」通常是：`layouts/baseof.html` 与公共 docs/blog `baseof*.html`；navbar、footer、sidebar、TOC、search、head CSS 的 partial 及对应 hook；旧品牌文档外壳 partial；`asciinema`、`echarts`、`infographic`、`doc-carousel`、`details`、`tab` / `tabpane`、card 与 `param` 的 shortcode 副本；只服务于上述实现的 JS、Lunr 副本、轮播代码与 SCSS；不再被需要的 PostCSS 与 Autoprefixer 步骤。删完之后两类问题：站点脚本报 `$ is not defined`（主题不带 jQuery，需自己引入 `js/jquery.min.js`）；用 Docsy `blocks/*` 搭的首页报 `template for shortcode "blocks/cover" not found`（主题没有这组 shortcode，改用 `data/home/<语言>.yaml` 首页分区或页面 `layout: landing`）。

## 从 0.4 升级的要点 {#from-0-4}

- 顺序翻页默认开启：`docs`、`book`、`blog` 页尾都有上一页/下一页；刻意不属于序列的页面用 `pager: false` 退出。
- 顶栏在所有布局显示：紧凑状态只有一行图标导航，无第二套移动端手风琴菜单，依赖旧移动菜单的本地脚本与测试要删；整个分区不要顶栏用 cascade 的 `navbar_enabled: false`。
- 页脚默认 `fat` 且全站生效，只接受 `fat` / `slim` / `none`；页脚数据必须放 `data/footer/<语言>.yaml`（单语言 `data/footer.yaml`），`data/home` 里残留 `footer` 键会告警，严格构建拒绝。
- 单键导航默认开启：`/` 打开完整搜索，`\` 只进命令模式；页面操作挪到面包屑旁的拆分按钮。
- 代码块 DOM 变了：`.td-code` 外壳套在原 `.highlight` 外面（`.highlight` 与 `.chroma` 都保留），站点 CSS 的 `.td-content > .highlight` 这类直接子选择器要改成后代选择器 `.td-content .highlight`。
- 两个 ICP 页脚参数被移除：`footer_icp` 与 `footer_icp_url` 换成一个支持行内 Markdown 的字符串 `footer_center_info`，如 `'[京ICP备00000000号](https://beian.miit.gov.cn/)'`。
- 数学公式要站点自己开 passthrough：Hugo 不合并主题的 `markup` 配置，用 `\(…\)`、`\[…\]`、`$$…$$` 的站点必须在自己 `hugo.yml` 启用 goldmark passthrough；`math: true` 不是启用开关。

## 升级验证 {#verify}

| 表面 | 看什么 |
| --- | --- |
| 文档 / Book | 侧栏顺序、翻页、标题、页面操作、编号与交叉引用 |
| 博客 | 时间顺序翻页、RSS 归属、顶栏与页脚 |
| 首页 / Landing | 无 JS 时的内容、紧凑菜单、打印 |
| 发布页 | 推导出的下载 URL、校验和、发布状态 |
| 组件 | 站点用得最多的那几个组件各找一页看渲染结果 |
| 无障碍 | 纯键盘走一遍、焦点顺序、两种配色、强制颜色模式 |
| 部署 | 站内链接与资源都保留了 base path 前缀 |

```bash
make check     # 同级本地主题：构建、输出、翻译与渲染后链接
make browser   # 同级本地主题：无障碍、响应式与交互行为
make build     # go.mod 固定的公开主题，不带本地替换
```

> 本地构建成功不等于发布完成：源码提交通过验收、公开标签能通过模块代理解析、消费站固定版本及校验和、生产部署通过验证，是彼此独立的状态。最后一步在真实环境：先部署预览，在真实 URL 验证页面与浏览器网络请求，评审通过再合并，合并后在生产做冒烟测试。

## 回滚 {#rollback}

回滚的是版本固定，不是工作树：

```bash
hugo mod get github.com/pgsty/oink@v1.0.0   # 示例：本站上一个已知可用的标签
hugo mod tidy
rm -rf public resources/_gen
hugo --gc --minify --panicOnWarning
```

原则：保留升级前的模块固定、站点 commit 与已知可用部署产物，回滚时三者一起恢复；不要只回滚一部分（给新主题塞回旧布局副本会得到更难诊断的混合状态）；升级分支与验收证据都留着。线上产物回滚见「发布上线 → 回滚」。

---

# 排错与检查

先做一次干净的生产构建，从第一条错误开始看，后面多半是级联结果：

```bash
rm -rf public resources/_gen
hugo --gc --minify --printPathWarnings --panicOnWarning --logLevel info
```

日志里出现 npm、PostCSS、Autoprefixer 或下载浏览器资源的步骤，说明混进了上游 Docsy 流程。

## 构建 {#build}

| 症状 | 原因 | 修法 |
| --- | --- | --- |
| 构建报要求更高的 Hugo 版本 | 装的是标准版而非 Extended，或版本低于 0.160.1 | `hugo version` 输出里必须有 `extended`。多版本共存先查 `PATH` 与版本固定配置 |
| `module "github.com/pgsty/oink" not found` | 主题没解析出来 | Hugo Module：看 `hugo mod graph`、`go.mod`、`go.sum` 及有无多余 workspace / replace。submodule：CI 是否在 Hugo 之前跑 `git submodule update --init`。归档/克隆：`theme:` 与 `themes/` 目录名一致 |
| 模块下载卡住或超时 | Go 模块代理不通 | 走 `GOPROXY`：`export GOPROXY=https://goproxy.cn,direct`；隔离环境改离线归档或提交 `themes/oink/` |
| 页面出现 `{.cards}`、`{.steps}`、`{caption=…}` 原样文字 | 站点没开 goldmark 块级属性 | `hugo.yml` 必须有下面那三项，主题的 `markup` 配置不会被合并 |
| 图片带属性行时被包进 `<p>`，图注没生效 | 缺 `wrapStandAloneImageWithinParagraph: false` | 同上，三项一起加 |
| 行内 HTML 被转义成文字 | 缺 `renderer.unsafe: true` | 同上 |
| `\(…\)` `$$…$$` 原样显示 | 站点没启用 goldmark passthrough | 见公式；`math: true` 不是启用开关 |
| `shortcode "tabs" must be closed or self-closed` | 有 `{{< tabs >}}` 没写对应 `{{< /tabs >}}` | 报错带 `文件:行:列`，去那一行补闭合标记 |
| `template for shortcode "tabs" not found` | 正文写了不存在的 shortcode，或引用语法没转义 | 讲解 shortcode 语法时在开关标记内侧各加一对 `/*` 与 `*/`；名字打错就改回正确名字 |
| `... attributes: unknown attribute "witdh" at ...` | 属性行里的键拼错或不允许 | 警告列出允许键并忽略坏属性；`style` 与 `on*` 同样丢弃。`--panicOnWarning` 发布时变成失败 |
| `shortcode "field": unsupported parameter "colour" at ...` | shortcode 参数名不对 | 警告指出 shortcode、参数、文件与行号后忽略；严格发布失败 |
| `invalid params.ui.page_width "widee" (allowed: normal \| wide \| full) -- using "normal"` | 配置或 front matter 取值不在允许集合 | 配置类错误降级不中断；消息带键名、收到的值与回退值。加 `--panicOnWarning` 就上不了线 |
| 某页设置不生效也无提示 | 键写在了 front matter 的 `ui:` 段里 | 页面键写在 front matter 顶层，键名是站点键去掉 `ui.`；写进 `ui:` 段没人读也没人报错 |
| 构建通过但线上少东西 | 有 WARNING 没人看 | 构建命令加 `--panicOnWarning`。非法取值、giscus 必填键缺失、不支持的 `comments.type`、弃用提示都只是告警 |

三项 goldmark 配置：

```yaml {title="hugo.yml"}
markup:
  goldmark:
    parser:
      wrapStandAloneImageWithinParagraph: false
      attribute:
        block: true
    renderer:
      unsafe: true
```

两个最常见 shortcode 报错（注意结尾 `文件:行:列`）：

```text
ERROR error building site: assemble: failed to create page from pageMetaSource /a:
  "…/content/docs/x.md:4:1": failed to extract shortcode:
  shortcode "tabs" must be closed or self-closed

ERROR error building site: assemble: failed to create page from pageMetaSource /a:
  "…/content/docs/x.md:4:5": failed to extract shortcode:
  template for shortcode "tabs" not found
```

## 语言 {#language}

| 症状 | 原因 | 修法 |
| --- | --- | --- |
| 译文页面不出现 | 四种可能，按顺序查 | ① `hugo.yml` 有 `languages.zh` 且设了 `weight`；② 文件名是 `page.zh.md`，`zh` 必须小写；③ 译文 front matter 没有 `draft: true`、`date` 不在未来；④ 影响路由的元数据与源文件一致 |
| 语言切换跳到首页 | Hugo 没找到对应译文 | 设计行为：找不到译文就回退到目标语言首页。要跳到对应页面需译文文件确实存在 |
| 锚点链接打开页面却不定位 | 译文标题文字不同，自动生成的 ID 也不同 | 在译文标题上显式写英文 ID：`## 安装 {#installation}`。标题含 shortcode 或行内 HTML 时不要凭文本猜 ID |
| 菜单 / 首页分区没翻译 | 这些不在页面里，在配置与数据文件里 | 菜单在 `languages.<lang>.menus`，首页分区在 `data/home/<lang>.yaml`，界面字符串在 `i18n/<lang>.yaml` |
| 中文页 `hreflang` 指向英文首页 | 该页没有英文对等文件 | 补上英文页，或接受回退：它同时是「Hugo 有没有认出译文关系」的探针 |

## 搜索 {#search}

| 症状 | 原因 | 修法 |
| --- | --- | --- |
| 搜索框有但一直没结果 | 索引没生成 | `params.offline_search: true` 后产物根目录应有 `offline-search-index.<语言>.json`，每种语言一份。没有就是没开 |
| 索引文件请求 404 | `baseURL` 不对 | 子路径部署下 `baseURL` 配错是最常见原因。先在浏览器网络面板看它去哪里取索引 |
| `hugo server` 下搜不了，构建出来正常 | 站点把预览期索引关掉了 | `params.offline_search_on_serve` 默认 `true`；显式写成 `false` 时预览不生成索引，删掉或改回 `true` |
| 中文搜不到 | 多数不是分词问题 | 中文查询走主题 CJK 子串回退。先确认中文页进了中文索引（打开 `offline-search-index.zh.json`），再看分词 |
| 新页面搜不到，旧页面正常 | 索引是构建产物 | 重新构建。`hugo server` 下改了页面要等它重建完 |
| `params.search.algolia requires explicit appId, apiKey, and indexName values` | Algolia 三个键没配全 | 三个键必须显式给全，主题不会替你用别的项目凭据。不用 Algolia 就删掉这段配置 |
| 命令面板搜不到内容 | 它与全文检索是两件事 | 索引不可用时命令面板仍能打开，只提示索引不可用，页面操作与命令照常 |

## 平台 {#platform}

| 症状 | 原因 | 修法 |
| --- | --- | --- |
| GitHub Pages 上页面 404 或样式全丢 | 项目站点 URL 带仓库路径，`baseURL` 没带 | 用工作流里的 `--baseURL "${{ steps.pages.outputs.base_url }}/"`，别手写 |
| GitHub Pages 上「最后修改时间」「贡献者」全空 | checkout 是浅克隆 | `actions/checkout` 加 `fetch-depth: 0`：`enableGitInfo` 要读完整历史 |
| Cloudflare Pages 构建报 Hugo 版本太低 | 构建镜像默认 Hugo 低于主题要求 | Production 和 Preview 两个环境都设 `HUGO_VERSION`，并设 `SKIP_DEPENDENCY_INSTALL=1` |
| 托管商构建时拉不到主题 | 构建环境没有 Go | Hugo Module 需要 Go。平台不提供就改 submodule 或把 `themes/oink/` 提交进仓库 |
| CI 上构建结果和本地不一样 | `go.work` 参与了 CI 构建 | CI 里设 `GOWORK: off` 与 `HUGO_MODULE_WORKSPACE: off`，只认 `go.mod` 固定的版本 |
| 预览部署被搜索引擎收录了 | 预览也用了 production 环境构建 | 预览构建不要带 `--environment production`，非 production 自带 `noindex` 与 `Disallow: /` |
| macOS 报打开文件过多 | 实时预览监视的文件超过 shell 限制 | 先把生成目录与无关目录排除出监视范围（通常才是根因）；再考虑 `ulimit -n` |
| WSL 下很慢或漏掉改动 | 跨 Windows 挂载点工作 | 让 Hugo 处理 Linux 文件系统里的路径，跨文件系统变更通知与权限行为会让实时重载失效 |
| 缺 Bootstrap / Font Awesome / Lunr / Mermaid 之类资源 | 发行物不完整 | 不要用 CDN URL 掩盖。确认 `assets/third_party/`、`assets/js/third_party/`、`static/webfonts/`、`VENDOR.json` 都在；确实缺就重新获取同一个固定版本 |

## 站点自带检查 {#site-checks}

前两条任何 OINK 站点都能用，后面几条是本仓库 npm 脚本，其它站点跑等价检查即可。

| 检查 | 命令 | 管什么 |
| --- | --- | --- |
| 零告警构建 | `hugo --printPathWarnings --panicOnWarning` | 重复输出路径、参数非法、外部集成配置不全 |
| 输出信任检查 | `python3 bin/check-output-security.py --public public --base-url https://oink.pgsty.com/` | 四种输出里每个 `href` / `src` 都是站内相对或 `http(s)` / `mailto` / `tel`；没有 `javascript:` URL、没有行内 `on*`；跨站 `<iframe>` `<script>` `<img>` 等要显式加 `--third-party` 才放行 |
| 翻译对等 | `node scripts/check-doc-translations.mjs --public public` | 每个英文页有没有中文对等页，以及渲染后标题 ID 是否逐一对齐；锚点链接错位在这里暴露 |
| 完整门禁 | `npm test` | 六项串起来跑 |

`npm test` 六项：`test:base`（先构建，再跑 Markdown 风格、翻译对等、渲染后 Markdown 与链接检查）、`test:hugo-build`（博客元数据、RSS、内容组件、构建过程零弃用提示）、`test:md-output`（Markdown 与 `llms.txt` 输出的 golden 比对，字节级）、`test:alt-site`（用 `tests/fixtures/*.yml` 各路配置各构建一次）、`test:favicons`（head 输出 golden 比对）、`test:release-pin-contract`（站点公告版本与 `go.mod` 固定版本是否一致）。浏览器行为另开一套：`npm run test:browser` 依次跑 Playwright 的无障碍（axe WCAG AA）、响应式外壳、键盘导航、内容组件、代码块与场景组件六个套件。

## 诊断习惯与求助

用固定的 Hugo Extended 版本复现；清掉 `public/` 与 `resources/_gen` 再重建排除陈旧缓存；对比开发与生产两套配置层；看第一条错误而非最后那条；用一个最小页面区分「主题行为」与「站点覆盖」（可疑内容单放一页，站点覆盖分批重新启用以定位）；看故障页面的控制台与网络面板，尤其是 404 资源路径。

开 issue 带上：Hugo 版本（`hugo version` 完整输出）、主题版本（`hugo mod graph | grep oink`）、第一条完整错误、能复现的最小页面或最小站点。渠道：主题与文档 <https://github.com/pgsty/oink/issues>；本站内容 <https://github.com/pgsty/oink.pgsty.com/issues>；上游 Docsy 兼容性 <https://github.com/google/docsy/discussions>。
