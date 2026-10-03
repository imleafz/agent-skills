# 定制站点：配置 · 品牌 · 首页 · 导航 · 布局

来源：https://oink.pgsty.com/zh/docs/customize/（OINK v1.1.0 文档）

站点级配置：`hugo.yml` 参数、`data/` 数据文件、`assets/` 样式入口。页面级 front matter 见创作内容栏目。

## `hugo.yml` 分层与原则 {#layers}

| 层 | 例子 | 定义方 |
| --- | --- | --- |
| Hugo 原生顶层键 | `baseURL` `title` `languages` `markup` `outputs` `taxonomies` `module` | Hugo 本身 |
| `params` 顶层 | `logo` `offline_search` `github_repo` `version` `page_width` `comments` | 主题读取的站点级选项 |
| `params.ui.*` | `navbar_enabled` `sidebar_width_min` `typography` `pager_types` | 外壳、导航与阅读界面 |
| `params.<运行时>` | `mermaid` `plantuml` `drawio` `markmap` | 各内容运行时自己的开关与端点 |

最小可用配置（前两层）：

```yaml {title="hugo.yml"}
title: 产品文档
baseURL: https://docs.example.com/
defaultContentLanguage: zh
enableGitInfo: true

module:
  imports:
    - path: github.com/pgsty/oink
  hugoVersion:
    extended: true
    min: 0.160.1

params:
  offline_search: true
  github_repo: https://github.com/example/product-docs
```

配置原则：

- 主题默认保守：交互功能（本地搜索、图片缩放、评论、反馈、深浅色菜单）默认关闭，只写要改的键。
- 没有总开关：不存在 `oink.enabled`，没有 `params.oink.*`，也没有 Docsy 外壳与 OINK 外壳的切换选项。
- 非法值告警并回退文档写明的默认值，站点照常构建；发布关卡用 `--panicOnWarning` 使其成为硬失败。
- `theme_color` 低于 AA 对比度（4.5:1）会告警但**照常生效**，警告带可静默的 `ignoreLogs` id；只有解析不出的十六进制才被丢弃。
- 主题模板没有 `errorf`，自身从不中断构建。会中断的只有 Hugo 原生问题：解析不到目标的内容引用、低于 `module.hugoVersion.min`。

### 页面级覆盖优先级 {#overrides}

从高到低：页面 front matter → 祖先分区 `_index.md` 的 `cascade`（离页面越近越优先）→ 站点 `params`。**写进 front matter 时去掉 `ui.` 前缀**（站点 `params.ui.reading_time` → 页面 `reading_time`）；`ui:` 块里的键不会被读取也不会报错。

```yaml {title="content/docs/_index.md"}
---
title: 文档
cascade:
  type: docs
  footer_style: slim
  feedback: true
---
```

### 三项 goldmark 前置 {#goldmark}

Hugo 不把主题模块的 `markup` 合并进站点，这三项必须写在站点 `hugo.yml`：

```yaml {title="hugo.yml"}
markup:
  goldmark:
    parser:
      wrapStandAloneImageWithinParagraph: false
      attribute:
        block: true
    renderer:
      unsafe: true
    extensions:
      passthrough:
        enable: true
        delimiters:
          block: [['\[', '\]'], ['$$', '$$']]
          inline: [['\(', '\)']]
  highlight:
    noClasses: false
  tableOfContents:
    endLevel: 4
```

缺 `attribute.block`：`{.fields}` `{.steps}` `{caption=…}` 原样显示。缺 `passthrough`：`\(x\)` 不成公式。缺 `unsafe`：步骤与卡片 HTML 被转义。

## `params.*` 全表 {#params}

默认值一栏空着表示主题没有默认值。分组如下。

### 站点身份与品牌 {#identity}

| 键 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `title` | string | | 站名，显示在顶栏、`<title>` 与页脚 |
| `baseURL` | string | | 生产域名；子路径部署带上路径段 |
| `copyright` | string | | 版权行兜底，`params.copyright` 未设时按 HTML 渲染 |
| `enableGitInfo` | boolean | false | 打开后才有「最后修改」与 commit 信息 |
| `enableRobotsTXT` | boolean | false | 生成 `robots.txt` |
| `enableEmoji` | boolean | false | 允许 `:smile:` 简码 |
| `params.logo` | string | icons/logo.svg | 品牌方形图标，指向 `assets/` 或 `static/` |
| `params.wordmark` | string | | 横向字标；设置后替代「图标 + 站名」 |
| `params.description` | string | | 站点描述，页面无 `description` 时作 meta 兜底 |
| `params.copyright` | string 或 map | | 字符串按 Markdown；map 接受 `authors` `from_year` `to_year`（`present` 表示今年） |
| `params.footer_center_info` | string | Powered by [Oink](https://oink.pgsty.com) | 页脚中间行内 Markdown，空字符串即隐藏 |
| `params.author` | string 或 map | | RSS 作者；map 接受 `name` 与 `email` |
| `params.ui.theme_color` | string | | `#rgb`/`#rrggbb`，为外壳强调底着色；不影响正文链接与行内代码 |
| `params.ui.theme_color_dark` | string | 派生 | 暗色一半；省略时从 `theme_color` 提亮派生到暗色画布达 AA |

favicon 无参数，按约定名扫描 `static/`（`favicon.ico` `favicon.svg` `favicon-NxN.png` `apple-touch-icon.png` `apple-touch-icon-NxN.png`）。

### 外壳类型与栏目根 {#shell}

外壳按**页面 type** 生效，不看路径；文档可放任意目录再用 cascade 给 `type: docs`。

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `params.ui.shell_types` | list | [docs, book, blog, swagger] | 哪些 type 使用带侧栏的阅读外壳 |
| `params.ui.docs_section` | string | docs | 文档栏目根目录名，只用于导航解析 |
| `params.ui.blog_section` | string | blog | 博客栏目根目录名 |
| `params.ui.docs_sidebar_root` | enum | section | `section`：docs 页侧栏根是文档栏目；`home`：是站点首页 |
| `params.ui.quick_links` | list | [docs_section, blog_section] | 命令面板空查询列出的顶层菜单 identifier |
| `params.ui.sidebar_root_enabled` | boolean | true | 允许子分区用 `sidebar_root_for: self` 自成一棵侧栏树 |
| `params.ui.sidebar_root_menu` | boolean | true | 侧栏顶部显示栏目切换器；单入口时退化为普通链接 |
| `params.ui.section_index` | enum | list | 栏目首页子页列表样式：`list` 或 `cards`，可按分区覆盖 |
| `params.ui.section_index_columns` | integer | 2 | `section_index: cards` 时的列数 |

### 博客 {#blog}

作用于 `params.ui.blog_section` 指定栏目，可通过博客根 front matter 或 `cascade` 覆盖。

| 参数 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `params.ui.featured_image` | enum | none | 题图渲染：`none`、`banner`（标题上方 16:9 框出）、`wash`（铺在头部背后留 1/10 不透明度）、`hero`（外壳通栏背景并把开头下移）。单页与列表页一致，无题图则不渲染 |
| `params.ui.blog_index` | enum | list | 列表页形态：`list` 行列表、`cards` 卡片网格（16:9 题图+日期+栏目行+三行摘要）、`table` 每篇一行紧凑表格（栏目一次列全，不分年不分页） |
| `params.ui.blog_index_columns` | integer | 3 | `blog_index: cards` 列数；md 到 xl 之间恒两列，md 以下一列 |
| `params.ui.blog_index_size` | integer | 12 | `list` 与 `cards` 每页文章数；`table` 总是列全 |
| `params.ui.blog_index_toggle` | boolean | false | 让读者在列表/卡片/表格间切换 |
| `params.ui.toc_style` | enum | fixed | 右栏呈现：`fixed` 钉在视口；`flow` 跟随内容流、滚动后钉住的宽面板 |
| `params.ui.toc_taxonomies` | boolean | true | 右栏分类词云；既无目录也无词云的右栏不渲染 |

作者与系列是 taxonomy 而非参数。

### 顶栏与页脚 {#navbar-footer}

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `params.ui.navbar_enabled` | boolean | true | 是否渲染顶栏，可用页面顶层 `navbar_enabled` 覆盖 |
| `params.ui.navbar_autohide` | boolean | false | 顶栏收到视口上方，指针进入唤醒区才出现；<768px 或粗指针不生效 |
| `params.ui.footer_style` | enum | fat | `fat` 多列网格+版权行，`slim` 只有版权行，`none` 不渲染 |
| `params.ui.dark_mode` | boolean 或 map | false | `true` 同时启用深色调色板与控件；只要控件写 `{ show_menu: true }`；只要调色板写 `{ show_menu: false, enable: true }` |
| `params.ui.breadcrumb` | boolean | true | 面包屑；`false` 关闭。顶层分区本就省略只有一级的面包屑 |
| `params.ui.page_context_menu.enable` | boolean | true | 标题旁的页面操作拆分按钮 |
| `params.ui.page_context_menu.assistant_links` | boolean | false | 显示「在 ChatGPT / Claude 中打开」；点击时完整 URL 会离开本站 |
| `params.ui.page_context_menu.links` | list | [] | 自定义外部操作，`url` 支持 `{url}` `{title}` `{markdown_url}` |
| `params.ui.github_stars` | string 或 number | | 顶栏 GitHub 徽标星数，本地常量，不发请求 |
| `params.ui.alt_site` | map | | 单语言站页脚姊妹站链接，必填 `label` 与绝对 `http(s)` 的 `url` |

胖页脚列数据来自 `data/footer/<语言>.yaml`，不是参数。

### 侧栏 {#sidebar}

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `params.ui.sidebar_menu_compact` | boolean | true | 只展开当前分支与邻近条目 |
| `params.ui.sidebar_menu_foldable` | boolean | true | 允许读者展开/折叠分区 |
| `params.ui.sidebar_menu_truncate` | integer | 2000 | 一个分区最多渲染的条目数 |
| `params.ui.sidebar_cache_limit` | integer | 500 | 页数达到此值后复用中性导航标记，浏览器补 active |
| `params.ui.sidebar_width_min` | integer | 220 | 桌面端拖拽调宽下限，像素 |
| `params.ui.sidebar_width_max` | integer | 480 | 拖拽调宽上限，像素 |
| `params.ui.sidebar_item_overflow` | enum | ellipsis | `ellipsis` 长标题省略，`wrap` 换行 |
| `params.ui.sidebar_icon_policy` | enum | all | 图标密度：`all` 全部、`groups` 只有根与有子页节点、`none` 全不显示 |
| `params.ui.sidebar_expand_levels` | integer | 2 | 默认展开的树层级数 |
| `params.ui.sidebar_headings` | boolean 或 integer | false | 只对 `type: book` 生效：侧栏当前行下展开标题分支；整数 2–4，`true` 等于 2 |
| `params.ui.sidebar_enabled` | boolean | true | 左侧栏；`false` 关掉，通常按页面设置 |
| `params.ui.taxonomy_icons` | map | | 按分类复数名指定右栏分组图标，如 `tags: fa-solid fa-tags` |

### 目录 TOC {#toc}

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `markup.tableOfContents.startLevel` | integer | 2 | Hugo 原生：收录的最高标题级别 |
| `markup.tableOfContents.endLevel` | integer | 3 | Hugo 原生：收录的最低标题级别 |
| `params.ui.scroll_spy` | boolean | false | 1.x 静默兼容 no-op；普通外壳始终跟踪当前大纲标题 |

单页隐藏大纲用 front matter `notoc: true`。

### 翻页与页尾 {#page-end}

页尾组件顺序固定为分享 → 反馈 → 页面信息 → 翻页 → 评论，五者独立开关；反向链接在右栏目录旁。

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `params.ui.share` | list | [] | 分享目标，按序渲染，取值 `x` `bluesky` `mastodon` `facebook` `linkedin` `reddit` `hackernews` `telegram` `whatsapp` `line` `pinterest` `weibo` `chatgpt` `claude` `email` `copy`；纯 intent 链接，无 SDK/iframe/计数；未知目标告警丢弃 |
| `params.ui.pager_types` | list | [docs, book, blog] | 哪些 type 显示上/下一页；单页用 `pager: false` 退出；未知 type 告警丢弃 |
| `params.ui.annotation` | boolean | true | 正文末尾「最后修改」与出处区块；上游署名由页面 `upstream_link` 一族键驱动 |
| `params.ui.backlinks` | boolean | false | 右栏目录旁以「反链」组列出链接到本页的页面，构建时从普通链接派生 |
| `params.ui.translation_notice` | 语言代码或 false | false | 权威版本语言代码，译文页据此显示指回原文的说明 |
| `params.ui.reading_time` | boolean | false | 页面标题下显示阅读时长 |
| `params.ui.book_draft_banner` | boolean | false | Book 草稿页开头额外加一条横幅 |

### 搜索与命令面板 {#search}

本地搜索默认关闭；打开后命令面板才出现（顶栏放大镜、Cmd/Ctrl + K、`/`、`\`）。

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `params.offline_search` | boolean | false | 生成每语言一份本地索引并启用命令面板 |
| `params.offline_search_on_serve` | boolean | true | `hugo server` 预览时也构建索引；站点极大时设 `false` |
| `params.offline_search_index` | enum | content | 索引范围，逐级累加：`title` `heading` `summary` `content` |
| `params.offline_search_summary_length` | integer | 70 | `summary` 档摘录截断字数 |
| `params.offline_search_max_results` | integer | 10 | 结果条数上限，同时约束 Lunr 与中文子串兜底 |
| `params.ui.landing_search` | boolean | true | `layout: landing` 页面是否保留搜索入口 |
| `params.ui.command_palette.commands` | list | [] | 自定义命令，每条二选一：`url` 或内置 `action` |
| `params.gcs_engine_id` | string | | Google 可编程搜索引擎 ID，启用后引入外部服务 |
| `params.search.algolia` | map | | Algolia DocSearch，必须显式给出 `appId` `apiKey` `indexName`，缺一则告警并保持关闭 |

自定义命令每条只接受 `id` `title` `description` `icon` `keywords` `url` `action` 七个键；`id` 须匹配 `^[a-z][a-z0-9_-]*$` 且不与内置动作 ID 重名。分语言标题写在 `languages.<lang>.params.ui.command_palette.commands`。

### 键盘 / 图片缩放 {#keyboard}

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `params.ui.keyboard_nav` | boolean | true | 单键导航（WASD/方向键走树、j/k 跳标题、q/e 翻页、面板与外壳开关）；`false` 后运行时不进包 |
| `params.ui.image_zoom` | boolean | false | 允许正文图片点击放大；页面用 front matter `image_zoom` 覆盖 |

### 字体排版 {#typography}

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `params.ui.typography` | enum | technical | `technical` 用主题自带的 Inter / Chakra Petch / IBM Plex Mono；`system` 只用平台字体栈 |
| `params.ui.fonts` | map | | 为 `ui` `body` `heading` `code` `display` `meta` `print` 七个角色指定字体族；主题校验名称但不加载字体文件 |
| `params.page_width` | enum | normal | 外壳整体宽度：`normal` `wide` `full`，可逐页覆盖 |
| `params.reading_width` | enum | normal | Book 页正文阅读行宽：`slim` `normal` `wide`，不影响外壳 |

### 评论与反馈 {#comments-feedback}

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `params.comments.enable` | boolean | false | 站点级评论开关，页面用 front matter `comments` 覆盖 |
| `params.comments.type` | string | giscus | 目前只有 `giscus` 会真正渲染 |
| `params.comments.giscus.repo` | string | | 承载讨论的 GitHub 仓库，必填 |
| `params.comments.giscus.repoId` | string | | 仓库 ID，必填 |
| `params.comments.giscus.category` | string | | 讨论分类名，必填 |
| `params.comments.giscus.categoryId` | string | | 讨论分类 ID，必填 |
| `params.comments.giscus.mapping` | string | pathname | 页面与讨论的映射方式 |
| `params.comments.giscus.term` | string | | `mapping` 为 `specific`/`number` 时的讨论标题或编号 |
| `params.comments.giscus.strict` | string | 0 | 严格标题匹配 |
| `params.comments.giscus.reactionsEnabled` | string | 1 | 显示主贴表情 |
| `params.comments.giscus.emitMetadata` | string | 0 | 向父页面发送讨论元数据 |
| `params.comments.giscus.inputPosition` | string | top | 输入框在评论列表上方还是下方 |
| `params.comments.giscus.theme` | string | auto | giscus 主题，`auto` 跟随站点深浅色 |
| `params.comments.giscus.lightTheme` | string | light | 浅色模式的 giscus 主题或自定义 CSS URL |
| `params.comments.giscus.darkTheme` | string | dark | 深色模式的 giscus 主题或自定义 CSS URL |
| `params.comments.giscus.loading` | string | lazy | iframe 加载策略 |
| `params.comments.giscus.lang` | string | 按站点语言推导 | giscus 界面语言；中文站解析为 `zh-CN`/`zh-TW`/`zh-HK`，不支持则回落 `en` |
| `params.comments.giscus.ariaLabel` | string | Comments | 评论区容器 `aria-label`；多语言站需各写一份 |
| `params.comments.giscus.errorMessage` | string | Comments could not be loaded. | 加载失败文字；多语言站需各写一份 |
| `params.ui.feedback.enable` | boolean | false | 页尾「这页有帮助吗」两个按钮；无后端，有 `gtag` 时记录结构化事件 |
| `params.ui.feedback.reasons` | boolean | true | 选「否」后展开四个可选原因 |

四个 giscus 必填项缺任意一个，评论区就不渲染（不报错也不出现）。

### 仓库链接与页面信息 {#repository}

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `params.github_repo` | string | | 内容仓库 URL，解析「编辑本页」「查看历史」「新建子页」「提文档 issue」 |
| `params.github_project_repo` | string | github_repo | 产品仓库 URL，用于「提项目 issue」与顶栏 GitHub 入口 |
| `params.github_branch` | string | main | 编辑链接指向的分支 |
| `params.github_subdir` | string | | 内容站在 monorepo 里的子目录 |
| `params.path_base_for_github_subdir` | string 或 map | | 源路径重写；map 接受 `from` 与 `to` |
| `params.github_url` | — | — | 已移除，改写 `params.github_repo`；旧键现在没人读 |
| `params.ui.lastmod_commit` | enum | subject | 「最后修改」后附什么：`subject`/`hash`/`none` |
| `params.images` | string 数组 | — | 站点级社交卡片：页面无封面时填 `og:image`；只进元数据 |
| `params.upstream_source` | string | — | 声明了 `upstream_link` 的页面默认用哪条 `data/upstreams` 记录 |
| `params.upstream_modified` | boolean | false | 上游材料是否经过改编的站点默认值 |
| `params.default_featured` | — | — | 已移除，改写 `params.images` 或栏目 `cascade` 里的 `images` |

### 内容运行时 {#runtimes}

Mermaid、KaTeX、ECharts、Infographic、Asciinema、Swagger UI 与 Redoc 按内容自动检测，无需站点开关。

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `params.markmap` | boolean | false | 站点级启用思维导图围栏 |
| `params.mermaid` | map | | 透传给 `mermaid.initialize()`；键名全小写，深色模式自动覆盖 `theme` |
| `params.plantuml.enable` | boolean | false | 启用 PlantUML 围栏 |
| `params.plantuml.svg_image_url` | string | | PlantUML 服务 SVG 端点，启用时必填，缺失则告警并保持关闭 |
| `params.plantuml.svg` | boolean | | 用内联 SVG 而不是 `<img>` 渲染 |
| `params.drawio.enable` | boolean | false | 启用 `.drawio.svg` 图片的编辑按钮 |
| `params.drawio.drawio_server` | string | | Draw.io 编辑器地址，启用时必填，缺失则告警并保持关闭 |
| `params.highlight_classes` | boolean | true | 代码高亮输出 Chroma class；`false` 回到 Hugo 行内样式 |
| `params.ui.code_copy` | boolean | true | 代码块复制按钮；`false` 全局去掉，围栏 `copy=` 仍优先 |

### 输出格式 {#outputs}

主题声明自定义格式但不替站点打开：

```yaml {title="hugo.yml"}
outputs:
  home: [HTML, markdown, LLMS, NAVJSON]
  page: [HTML, markdown]
  section: [HTML, RSS, print, markdown]
```

| 格式 | 产物 | 说明 |
| --- | --- | --- |
| `HTML` | `index.html` | 交互形态，必选 |
| `markdown` | `index.md` | 每页纯 Markdown 版本，页面操作依赖它 |
| `LLMS` | `llms.txt` | 纯文本格式，通常只挂 `home` |
| `LLMSFULL` | `llms-full.txt` | 顶层栏目 opt-in：按侧栏阅读顺序拼接逐页 Markdown |
| `NAVJSON` | `navigation.json` | 首页 opt-in：把侧栏/翻页使用的导航序列化一次 |
| `print` | `_print/index.html` | 整分区打印页 |
| `BookManifest` | `book.json` | Book 根 opt-in，向 EPUB/PDF 打包工具交接的 JSON |
| `RSS` | `index.xml` | Hugo 原生，挂 `section` 让每栏目都有订阅源 |

打印参数：

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `params.print.toc` | boolean | true | 打印页开头生成目录 |
| `params.print.section_break_wordcount` | integer | 50 | 打印页中一节多少词以上才另起一页 |

### 多语言与版本 {#languages-versions}

| 键 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `defaultContentLanguage` | string | en | 不带路径前缀的首要语言 |
| `languages.<lang>.label` | string | | 该语言自称，显示在语言菜单里 |
| `languages.<lang>.locale` | string | | 完整 locale，用于 `<html lang>` 与 SEO |
| `languages.<lang>.weight` | integer | | 语言顺序，也是点击语言图标的循环顺序 |
| `languages.<lang>.title` | string | | 该语言的站名 |
| `languages.<lang>.direction` | string | ltr | RTL 语言设为 `rtl` |
| `params.version` | string | | 当前站点变体的版本标识 |
| `params.version_menu` | string | Version | 版本菜单标题 |
| `params.version_menu_pagelinks` | boolean | | 切版本时先尝试目标站点的同一路径 |
| `params.versions` | list | | 版本条目：`version` `url` `kind`，`name: '---'` 是分隔线 |
| `params.archived_version` | boolean | | 顶部显示「这是归档版本」横幅 |
| `params.url_latest_version` | string | | 归档横幅里指向最新版的链接 |
| `params.time_format_blog` | string | 2006-01-02 | 博客日期格式，可按语言覆盖 |
| `params.time_format_default` | string | 2006-01-02 | 其它日期格式，可按语言覆盖 |

### 其它 {#misc}

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `taxonomies` | map | | Hugo 原生：启用 `tag: tags` / `category: categories` |
| `params.taxonomy.page_header` | list | | 只在文章头部显示这几种分类；不设则显示全部 |
| `services.googleAnalytics.id` | string | | Hugo 原生：分析脚本只在生产构建注入 |
| `module.hugoVersion.min` | string | 0.160.1 | 主题声明的 Hugo 下限，低于它构建失败 |
| `module.hugoVersion.extended` | boolean | true | 必须是 Hugo Extended（要编译 SCSS） |

### 编辑器 Schema {#editor-schema}

主题在 `schema/` 携带 `site-params.schema.json`（校验 `hugo.yaml`）与 `front-matter.schema.json`。配合 VS Code YAML 扩展：

```json {title=".vscode/settings.json"}
{
  "yaml.schemas": {
    "https://raw.githubusercontent.com/pgsty/oink/main/schema/site-params.schema.json": "hugo.yaml"
  }
}
```

### 验证配置变更 {#verify}

```bash
hugo --printPathWarnings --panicOnWarning
```

输出 `Total in …` 且无 ERROR / WARN 才算通过。常见报错：

| 报错片段 | 原因 |
| --- | --- |
| `invalid params.ui.typography` | 预设只有 `technical` 与 `system` |
| `invalid footer_style … (allowed: fat \| slim \| none)` | 页脚形态写错 |
| `invalid page_width … (allowed: normal \| wide \| full)` | 页宽写错 |
| `invalid params.ui.section_index … (allowed: list \| cards)` | 栏目首页样式写错 |
| `invalid params.offline_search_index` | 索引范围只有 `title` `heading` `summary` `content` |
| `params.plantuml.enable requires an explicit params.plantuml.svg_image_url` | 开了 PlantUML 却没给端点 |
| `params.drawio.enable requires an explicit params.drawio.drawio_server` | 开了 Draw.io 却没给服务地址 |
| `params.search.algolia requires explicit appId, apiKey, and indexName` | Algolia 三项必须齐全 |
| `params.ui.image_zoom must be a boolean` | 写成了字符串 `"true"` |
| `theme_color … is not a #rgb or #rrggbb hex color` | 值不是十六进制，保留默认配色 |
| `theme_color_dark … has no theme_color to pair with` | 只设暗色一半而无有效 `theme_color` |
| `command … must define exactly one of url or action` | 自定义命令同时给了 `url` 和 `action`，或都没给 |
| `invalid params.ui.sidebar_icon_policy …; using all` | 取值拼错，仅警告 |

还要验证：每种语言各一页、缺译页回退、生产 `baseURL` 下链接（子路径部署易漏）。工具链固定 Hugo Extended `0.165.0`，下限 `0.160.1`。

## 品牌外观 {#brand}

改动文件：`hugo.yml`、`static/` 图标、`assets/scss/_variables_project.scss`、`assets/scss/_styles_project.scss`。**不要改主题目录**（Hugo Module 升级时整体替换）。

### 站名 {#site-title}

```yaml {title="hugo.yml"}
title: 产品文档

languages:
  en: { title: Product Docs, label: English, locale: en-US, weight: 1 }
  zh: { title: 产品文档, label: 简体中文, locale: zh-CN, weight: 2 }
```

顶层 `title` 是兜底，`languages.<lang>.title` 优先。

### Logo 与字标 {#logo}

```yaml {title="hugo.yml"}
params:
  logo: images/product-mark.svg
  wordmark: logo.svg
```

`params.logo` 是方形图标，顶栏、侧栏与页脚共用；放 `assets/` 经资源管线（可指纹化），放 `static/` 原样发布。`params.wordmark` 是横向字标，设置后顶栏替代「图标 + 站名」，窄屏放不下回落 `params.logo`。源 SVG 应紧贴图形裁切，必须带 `viewBox`，颜色继承 `currentColor` 或深浅色都够对比。

### favicon {#favicon}

无参数，扫描 `static/`：`favicon.ico` → `rel="icon"`；`favicon.svg` → `rel="icon" type="image/svg+xml"`；`favicon-NxN.png` → `rel="icon"` 带 `sizes`；`apple-touch-icon.png` / `apple-touch-icon-NxN.png` → `rel="apple-touch-icon"`。最小组合 `favicon.ico` + `favicon.svg` + `apple-touch-icon.png`；带尺寸后缀必须是正方形。额外 head 元数据用 `layouts/_partials/hooks/head-end.html` 钩子；改变发现规则覆盖 `layouts/_partials/favicons.html`。

### 主色与配色 {#colors}

两层：Bootstrap 语义色（编译期 Sass）与 OINK 品牌层（运行期 CSS 自定义属性）。先改语义色（在 Bootstrap 与 OINK 默认值**之前**加载）：

```scss {title="assets/scss/_variables_project.scss"}
$primary: #315f8f;
$secondary: #b4762e;
$success: #2c7a4b;
$warning: #9a6700;
$danger: #b42318;
```

需引用 Bootstrap 已定义变量或 map 时改用 `_variables_project_after_bs.scss`。品牌层浅深色**必须成对覆盖**：

```scss {title="assets/scss/_styles_project.scss"}
:root {
  --td-brand-copper: #a66722;
  --td-brand-mark-from: #1d588c;
  --td-brand-mark-to: #a66722;
}
[data-bs-theme='dark'] {
  --td-brand-copper: #e0a35c;
  --td-brand-mark-from: #7fb8e8;
  --td-brand-mark-to: #e0a35c;
}
```

可覆盖：`--td-brand-elev`、`--td-brand-silk`、`--td-brand-copper` 与 `--td-brand-copper-dim`、`--td-brand-line-strong`、`--td-brand-header-bg`、`--td-brand-shadow-sm`/`-md`、`--td-brand-mark-from`/`-to`/`-gradient`。

### 分区主题色 theme_color {#theme-color}

```yaml {title="hugo.yml"}
params:
  ui:
    theme_color: '#6d28d9'
    theme_color_dark: '#a78bfa' # 可选
```

按分区写更有用（写进分区根 `cascade`，站点默认仍是品牌色）：

```yaml {title="content/blog/_index.md"}
cascade:
  theme_color: '#6d28d9'
  theme_color_dark: '#a78bfa'
```

- **作用于**：侧栏选中行与 hover 灰底、hover 淡铺、目录药丸与轨道光点、Book 章节小标题 hover、标签/徽章 hover、内容卡片 hover 外边、分享按钮 hover 实心底、文本选中、焦点环、侧栏根切换器里每个分区的图标。
- **不作用于**：正文链接、外链、行内代码。
- 暗色一半可选，省略时从亮色向白提亮直到暗色画布达 AA。亮色才是主键：单独设 `theme_color_dark` 或放在非法 `theme_color` 旁，两种模式都不着色并告警。
- front matter 写 `theme_color: false` 让该页退出继承的栏目色（静默）；其它非十六进制取值告警。
- 对比度是检查而非强制：低于 AA（4.5:1）只告警，发布关卡会卡住直到调深或静默。Hugo 按键合并参数：分区设了 `theme_color_dark` 时某页只覆盖 `theme_color` 会继承那个暗色——要么两个都覆盖，要么都不覆盖。

### 深浅色模式 {#dark-mode}

```yaml {title="hugo.yml"}
params:
  ui:
    dark_mode: true
```

开启后顶栏出现主题控件：点击在浅/深色切换，悬停或键盘聚焦展开「跟随系统/浅色/深色」。选择存本地，无选择时跟随 `prefers-color-scheme`；切换脚本在首屏绘制前设好 `data-bs-theme`，无闪烁。只要调色板写 `{ show_menu: false, enable: true }`；`false`（默认）两者都不启用。

### 字体 {#fonts}

```yaml {title="hugo.yml"}
params:
  ui:
    typography: technical # technical | system
```

- `technical`（默认）：界面与正文用 Inter（可变字重，中文与 emoji 落到平台字体），标题装饰用 Chakra Petch，代码用 IBM Plex Mono。字体本地分发，不请求 Google Fonts。
- `system`：全部回到平台字体栈。

选中的值写入 `<html data-td-typography="…">`。非法取值告警回落 `technical`。

七个字体角色：

| 属性 | 配置键 | 用在哪 |
| --- | --- | --- |
| `--td-ui-font-family` | `ui` | 导航、控件与界面文字 |
| `--td-body-font-family` | `body` | 正文与博客 |
| `--td-heading-font-family` | `heading` | 正文标题 |
| `--td-code-font-family` | `code` | 代码与终端 |
| `--td-display-font-family` | `display` | 字标与展示型大标题 |
| `--td-meta-font-family` | `meta` | 技术标签与元数据 |
| `--td-print-font-family` | `print` | 打印正文 |

`ui` 是主字体：`body` 经它解析、`heading` 又经 `body` 解析，只写 `ui` 一行即可一起换。配置里只写字体族名，不加载字体文件；每个列表以通用族收尾：

```yaml {title="hugo.yml"}
params:
  ui:
    fonts:
      ui: "'Source Han Sans SC', 'PingFang SC', sans-serif"
      code: "'Sarasa Mono SC', 'Noto Sans Mono CJK SC', monospace"
```

取值只放行纯字体族语法（引号名、裸标识符、允许前导连字符、任何文字系统的名字）；分号、花括号、括号、`url()`、尖括号不通过。自带字体文件时把 `.woff2` 放 `static/webfonts/` 并在 `_styles_project.scss` 里 `@font-face` 声明后改写角色。从 Docsy 迁移的旧 Sass 变量（`$td-fonts-serif`、`$font-family-sans-serif`、`$font-family-base` → ui/body；`$headings-font-family` → heading；`$font-family-code` → code）仍喂进对应角色；Docsy 的三个 Google Fonts 变量已被忽略。

### 页宽与页脚 {#page-width-footer}

```yaml {title="hugo.yml"}
params:
  page_width: normal # normal | wide | full
  ui:
    footer_style: fat # fat | slim | none
  copyright:
    authors: '[产品团队](https://example.com/)'
    from_year: 2026
    to_year: present
  footer_center_info: 'Powered by [Oink](https://oink.pgsty.com)'
```

- `page_width` 控制外壳整体宽度，可逐页或 cascade 覆盖；Book 页另有 `reading_width`（`slim`/`normal`/`wide`）改正文阅读行宽。
- `fat`（默认）多列链接网格 + 版权行；`slim` 只有版权行；`none` 不渲染。多列网格数据在 `data/footer/<语言>.yaml`；配了 `fat` 但无数据时自动降级 `slim`。
- `params.copyright` 接受 Markdown 字符串或三键 map（`present` 表示今年）；`footer_center_info` 是行内 Markdown，显式空字符串即隐藏。

### SCSS 入口 {#scss}

| 文件 | 什么时候用 |
| --- | --- |
| `_variables_project.scss` | 在 Bootstrap 与 OINK 默认值之前设置 Sass 变量（`$primary`、字体变量） |
| `_variables_project_after_bs.scss` | 设置依赖 Bootstrap 已有定义的变量或 map |
| `_styles_project.scss` | 在主题组件样式之后写选择器与 CSS 自定义属性 |

编译顺序：Bootstrap 函数 → 项目变量 → OINK 默认值与 Bootstrap → Bootstrap 之后的项目变量 → OINK 组件与品牌层 → 项目样式。七个字体角色与 `--td-brand-*` 是公开接口；`--td-shell-*` 一类是实现细节。

**不该做**：改主题目录文件、单独 `@import` 主题内部 partial、为改颜色覆盖 `baseof.html`、引用远程样式表或字体 CDN。额外第三方 CSS 用 `layouts/_partials/hooks/head-end.html` 钩子。

## 首页与落地页 {#home}

首页是一份数据：`data/home/<语言>.yaml` 的 `sections` 列表决定从上到下有哪些分区，每个分区内容在同一文件按名字取。普通页面加 `layout: landing` 用同一套分区。全部分区服务端渲染，价格/star 数/截图/头像/下载状态必须构建前就在仓库里。Docsy 的 `blocks/*` shortcode 不存在，保留会报 `template for shortcode "blocks/cover" not found`。

### 数据来源 {#home-data}

内容文件只留标题与描述：

```yaml {title="content/_index.zh.md"}
---
title: OINK
description: 本地优先、仅依赖 Hugo 的技术文档主题
---
```

```filetree {title="首页数据"}
- data/
  - home/
    - en.yaml
    - zh.yaml
```

查找顺序：`data/home/<当前语言>.yaml` → `data/home/en.yaml` → 单语言站的 `data/home.yaml`。文件结构两层：

```yaml {title="data/home/zh.yaml 骨架"}
sections:
  - hero          # 用 hero: 键的数据
  - capabilities
  - type: cards   # 用 cards 分区，但读 release: 键的数据
    key: release
  - cta

hero: { … }
capabilities: { … }
release: { … }
cta: { … }
```

### 最小可用首页 {#minimal}

链接写成不带前导斜杠的站内路径，主题补当前语言前缀（`docs/start/` → `/zh/docs/start/`）。

```yaml {title="data/home/zh.yaml"}
sections:
  - hero
  - cards
  - cta

hero:
  eyebrow: 本地优先 · 仅依赖 Hugo
  title_lines:
    - words:
        - { text: PGSTY OINK }
  lead: 组件写在 Markdown 里，资源随主题分发，一份内容产出四种输出。
  image:
    light: images/hero-light.webp
    dark: images/hero-dark.webp
    alt: OINK 工程文档插图
  actions:
    - { label: 十分钟上手, url: docs/start/, icon: fa-solid fa-rocket, style: primary }
    - { label: 看组件, url: docs/components/, style: ghost }

cards:
  title: 工程文档需要的都在里面
  columns: 3
  items:
    - title: Markdown 原生组件
      desc: 提示块、标签页、参数表、文件树都是 Markdown 语法的一部分。
      icon: fa-solid fa-cubes
      url: docs/components/

cta:
  title: 从一个能跑的双语站点开始。
  label: 开始使用
  url: docs/start/
  style: primary
```

### Hero {#hero}

```yaml {title="data/home/zh.yaml"}
hero:
  eyebrow: PROJECT 1.0 · 本地优先         # 标题上方小字，带状态点
  title_lines:                            # 逐行控制的大标题
    - words:
        - { text: PGSTY OINK }
  lead: 一句话说清这是什么。                 # 支持行内 Markdown 与 <br>
  note: 无需 Node.js                       # 带图标的补充行
  note_icon: fa-solid fa-circle-check
  title_size: 4.25rem                     # 只接受 rem / em / px
  image:
    light: images/hero-light.webp
    dark: images/hero-dark.webp           # 只给一个时深浅色共用
    alt: 首屏插图
  media:
    ratio: '1fr 240px'                    # 文案与配图的列宽
    max_width: 240px
    hide_below: md                        # sm | md | lg | xl 以下隐藏配图
  actions:
    - { label: 开始使用, url: docs/start/, icon: fa-solid fa-rocket, style: primary }
    - { label: GitHub, url: 'https://github.com/pgsty/oink', external: true, style: ghost }
  detail: { label: 看看它长什么样, url: docs/about/showcase/ }
```

不写 `title_lines` 时用 `title`，都没有时用站点标题。配图是 CSS 背景图，`alt` 有值时容器带 `role="img"`，无值时对辅助技术隐藏。`align: center` 是纯文字居中首屏；与图片同时出现时告警并回退 `start`。

### 分区注册表 {#registry}

22 种分区，名字用连字符（旧数据里的下划线会被规范化）。除 Hero 外每种共用 `eyebrow`/`title`/`desc`（或 `text`）三个抬头字段与一个 `class`。

| 类型 | 放什么 |
| --- | --- |
| `hero` | 首屏：大标题、按钮、跟随主题的配图 |
| `metrics` | 数字事实，可选计数动画与来源链接 |
| `capabilities` | 左右交替的能力叙事 + 专用视觉面板 |
| `principles` | 编号的产品原则 |
| `cards` | 通用卡片集合：功能、场景、入口 |
| `logo-wall` | 工具与伙伴，网格或纯 CSS 跑马灯 |
| `gallery` | 截图墙 |
| `testimonials` | 引语与署名 |
| `contributors` | 人、角色、头像与链接 |
| `faq` | 折叠或平铺的问答 |
| `markdown` | 一段自由 Markdown |
| `cta` | 结尾的行动号召 |
| `pricing` | 价格档位卡片 |
| `pricing-compare` | 档位功能对比矩阵 |
| `command-box` | 一条可复制的命令 |
| `steps` | 有序流程，可带命令 |
| `timeline` | 带日期的里程碑 |
| `code-plate` | 展示面板里的代码 |
| `preview` | 一段 Markdown 源码与它渲染的样子并排 |
| `case-study` | 案例：指标 + 引语 + 出处 |
| `download` | 一个或多个 `data/download/` 记录 |
| `bar-chart` | 不用图表 JS 的数值对比 |

写错类型名会给出 `unknown section type` 警告并跳过该分区；`--panicOnWarning` 使其失败。

### 常用分区写法 {#section-examples}

`cards` 用 `columns` 控制列数：

```yaml
cards:
  title: 应用场景
  columns: 4
  link_label: 了解详情
  items:
    - title: 书籍出版
      meta: 长篇
      icon: fa-solid fa-book-open
      desc: 编号图表式例、交叉引用、索引与整本打印。
      url: docs/write/book/
```

`capabilities` 一屏一条能力，右侧 `visual.type` 只能是 `shell`、`components`、`code`、`image`、`card`：

```yaml
capabilities:
  title: 工程文档所需的能力，开箱即用
  items:
    - ref: 01 / 工程文档
      title: 为工程师与文档站设计
      url: docs/start/
      motto: 从第一次构建到长期维护都没有额外阻力
      bullets:
        - '开箱即用的[部署上线](docs/admin/deploy/)体验'
      value: 内容团队把时间用在文档上，而不是重复搭站点。
      visual:
        type: code
        title: build.sh
        lines:
          - { class: p, prefix: '$ ', text: hugo --gc --minify }
```

其余分区（`metrics` `command-box` `steps` `timeline` `code-plate` `preview` `case-study` `pricing` `pricing-compare` `download` `bar-chart`）的最小 YAML 见主题仓库夹具 [`tests/site/data/landing/demo/en.yaml`](https://github.com/pgsty/oink/blob/main/tests/site/data/landing/demo/en.yaml)，字段名可照抄。要点：

- `metrics.items[].animate` 开启计数；`source` 给来源链接；`compact: true` 缩写大数。
- `command-box` 用 `code` `lang` `note`。
- `steps.items[]` 可选 `cmd: { code: … }`。
- `timeline.items[]` 用 `date` `title` `desc`。
- `preview` 用 `file`（默认 `page.md`）与 `source`（右侧用站点渲染钩子渲染）。
- `case-study` 用 `stats[]` + `quote` + `source`。
- `pricing.tiers[]` 用 `name` `price` `period` `features[]` `cta`，`featured: true` 高亮。
- `pricing-compare` 用 `tiers[]` 与 `groups[].rows[]`，行内 `price_row: true` 表示价格行。
- `download` 用 `keys[]` 消费 `data/download/<key>.yaml`，不引入第二套版本模型。
- `bar-chart.items[]` 用 `label` `value` `group` `note`。

### 任意页面做落地页 {#landing-page}

普通内容页加两行 front matter：全宽画布，保留顶栏、命令面板与页脚，去掉侧栏与目录。

```yaml {title="content/pricing.zh.md"}
---
title: 价格
layout: landing
landing: pricing
---
```

数据按语言分文件：`data/landing/<key>/<lang>.yaml`。非首页落地页查找顺序：页面 front matter 的 `sections` → `data/landing/<key>/<精确语言>.yaml` → 单文件 `data/landing/<key>.yaml` 里的精确语言条目 → 英文或无语言后缀记录。全部找不到时告警并渲染无分区的 Landing 外壳。数据量小时可写在 front matter，但 `landing:` 与 `sections:` **互斥**：

```yaml {title="content/pricing.zh.md"}
---
title: 价格
layout: landing
sections:
  - type: hero
    data:
      title: 只用 Hugo 发布产品页面
      actions:
        - { label: 阅读文档, url: docs/, style: primary }
  - type: download
    data: { title: 下载, keys: [prd5] }
  - cta
---
```

### 分区条目写法 {#entry}

`sections` 每项可以是类型名字符串或 Map：

| 键 | 作用 |
| --- | --- |
| `type` | 分区类型；省略时用 `key` 当类型 |
| `key` | 从哪个键取数据，默认与 `type` 同名；同种分区用两次时区分 |
| `data` | 内联数据，不再到顶层查找键 |
| `id` | 分区锚点 ID，默认由 `key`/`type` 生成 |
| `enabled: false` | 停用该分区，保留数据 |
| `partial` | 换成站点自己的 partial（本地模板约定，非可移植数据） |

### 多语言与本地事实 {#home-i18n}

叙事文字优先分语言文件。共享事实记录可在字段级回退：`<字段>_<精确语言>` → `<字段>_<主语言>` → `<字段>`，语言标签里的 `-` 规范化成 `_`（中文站解析 `title_zh_cn`、`title_zh`、`title`）；不接受 camelCase 后缀。分区里的显示文字是站点数据，不是主题 i18n 字符串。

落地页外壳的可选事实写在 `hugo.yml`，运行时不取：

```yaml {title="hugo.yml"}
params:
  offline_search: true
  ui:
    landing_search: true          # 只有站点开了 offline_search 才显示命令面板
    github_stars: 2189            # 已提交的数字，不请求 GitHub API
    alt_site: { label: English site, url: 'https://example.com/' }
```

页脚不属于首页数据，读 `data/footer/<语言>.yaml`；`data/home/<语言>.yaml` 里残留的 `footer` 键会告警并忽略。输出形态：HTML 完整静态内容再按需加载 `landing.js`；打印保留内容、动态面变静态网格；Markdown 不带组件 class；RSS 不输出 Landing 分区。

## 导航与菜单 {#navigation}

导航没有第二套信息架构：顶栏来自 Hugo 的 `menus.main`，侧栏来自 `content/` 的目录结构。主题不读 `docs.json`、`navigation.yaml` 一类并行导航树。

### 顶栏菜单 {#main-menu}

```yaml {title="hugo.yml"}
languages:
  zh:
    menus:
      main:
        - { identifier: docs, name: 文档, pageRef: /docs, weight: 20 }
        - { identifier: blog, name: 博客, pageRef: /blog, weight: 50 }
        - identifier: download
          name: 下载
          pageRef: /download
          weight: 60
          params: { icon: fa-solid fa-download }
```

`weight` 越小越靠前。`pageRef` 指站内页面，`url` 指外链（自动加 `target="_blank"` 与 `rel="noopener noreferrer"` 并带外链角标）。`identifier` 是稳定标识（`quick_links`、`sidebar_root_menu` 按它匹配），`name` 按语言翻译，identifier 不翻译。菜单项也可挂在页面 front matter：

```yaml {title="content/download/_index.md"}
---
title: 下载
menu:
  main:
    weight: 30
---
```

顶栏右侧 GitHub 入口**不是**菜单项，来自 `params.github_project_repo`（未设回落 `params.github_repo`）；标识为 `github` 的菜单项被菜单区跳过。

### 下拉菜单 {#dropdown}

用 Hugo 的 `parent` 建立父子关系，**只支持一级子项**：

```yaml {title="hugo.yml"}
menus:
  main:
    - { identifier: docs, name: 文档, pageRef: /docs, weight: 20 }
    - identifier: docs-start
      parent: docs
      name: 快速上手
      pageRef: /docs/start
      weight: 10
      params:
        icon: fa-solid fa-rocket
        description: 从 OINK Starter 起步，分层定制并部署
```

- 每条一目一行一个图标加标题；子项的 `params.description` 只是配置数据，面板不渲染。
- **父级本身是普通链接**：悬停或键盘聚焦展开面板，点击或回车进入父级页面；没有单独展开箭头。
- 键盘：向下箭头展开并聚焦第一项，Esc 关闭并归还焦点，点击外部关闭。
- 0.5 的 `params.columns` 已退役（设置会告警，面板保持单列）；再深一层会告警并降级成静态分组标题，**不**生成三级悬浮菜单。

### 菜单图标 {#menu-icons}

小于 `lg` 时菜单项只剩图标。解析顺序：目标页面 front matter `icon` → 菜单项 `params.icon` → 按 identifier/分区名的内置默认值（`docs` `blog` `examples` `community` `about` `download` `github` 等）→ `fa-solid fa-link`。图标写成一对 Font Awesome class。

### 标签菜单 {#taxonomy-menu}

顶层入口指向 taxonomy 页面（`/tags/`、`/categories/`）时自动渲染「标签 + 数量」chip 网格，按数量降序：

```yaml {title="hugo.yml"}
menus:
  main:
    - { identifier: tags, name: 标签, pageRef: /tags, weight: 60 }
```

### 顶栏控件 {#navbar}

顶栏高 50px，由品牌（Logo 或字标）、居中菜单、末端工具控件组成。窄屏下首页与 Landing 打开站点菜单抽屉，带侧栏的外壳页面打开侧栏抽屉。

| 视口 | 状态 |
| --- | --- |
| `lg` 及以上 | 品牌、居中文字菜单，搜索/版本/语言/主题/GitHub 控件；无抽屉按钮 |
| `md` 至小于 `lg` | 菜单以图标居中，工具控件留末端；无抽屉按钮 |
| 小于 `md` | 保留居中菜单图标，末端只留搜索与相应抽屉按钮；版本/语言/主题/快捷键帮助在页脚最底层栏 |

控件开关：搜索要 `params.offline_search`，版本菜单要 `params.versions`，语言菜单在配置两种及以上语言时自动出现，主题控件要 `params.ui.dark_mode`。

自动隐藏 `params.ui.navbar_autohide: true`：隐藏后顶栏仍保留 50px 高度；指针进入该区域上方 60% 感应带或键盘焦点进入时原位淡入；左右各 64px 不属于唤醒区。小于 768px、粗指针或纯触屏自动停用。首页不继承站点级开关（除非自身 front matter 显式开启）；Hero 页面保留覆盖在主图上并随其滚动的顶栏。

关闭顶栏：

```yaml {title="hugo.yml"}
params:
  ui:
    navbar_enabled: false
```

也可只关一页或一段（cascade: `navbar_enabled: false`）。关闭后主题补回原本由顶栏承担的界面：移动端子导航、侧栏顶部品牌与搜索行、大纲轨道上的工具按钮。

### 栏目切换器 {#root-menu}

侧栏顶部那一行决定当前显示哪棵树。入口集合按顺序去重构造：符合条件的顶层栏目 → 符合条件的 `sidebar_root_for: self` 分区 → 当前解析出的根。候选必须有 permalink，不能是分隔分组。

```yaml {title="hugo.yml"}
params:
  ui:
    sidebar_root_enabled: true
    sidebar_root_menu: true
```

让一棵大子树自成一个根：

```yaml {title="content/docs/api-v2/_index.md"}
---
title: API 参考 v2
sidebar_root_for: self
sidebar_root_link_self: true
---
```

`self` 让分区索引与后代都用新树；`children` 把索引留在父树只约束后代。设 `sidebar_root_menu: false` 会将它从全站候选排除。使用 `build.render: never` 或作为分隔分组的根不会成为切换器链接。没有入口时不渲染；只有一个入口时退化成无边框链接，两个及以上才是下拉菜单。切换器选一棵树，根链接选一篇文档。

### 面包屑与页面操作 {#breadcrumb}

面包屑行在标题上方，右端承载页面操作。顶层分区省略只有一级、与标题重复的面包屑。标签取本地化的 `linkTitle`，层级与侧栏一致。`params.ui.breadcrumb: false` 关闭。

页面操作是标题行末尾的拆分按钮：左半边一键复制本页 Markdown（成功后变绿对勾），右侧箭头展开完整菜单：

| 操作 | 出现条件 |
| --- | --- |
| 复制 Markdown 文本 | 站点开了 `markdown` 输出格式 |
| 在 ChatGPT / Claude 中打开 | `page_context_menu.assistant_links: true` |
| 查看 Markdown 源码 | `markdown` 输出格式 |
| 查看编辑历史 | `params.github_repo` 能解析出源文件路径 |
| 编辑本页 / 新建子页面 / 提交文档 issue | `params.github_repo` |
| 提交项目 issue | `params.github_project_repo` |
| 打印整个分区 | 分区开了 `print` 输出格式 |

```yaml {title="hugo.yml"}
params:
  ui:
    page_context_menu:
      enable: true
      assistant_links: false
      links: []
```

助手入口默认关闭：点击时**完整当前 URL（含 query 与 fragment）会发给第三方**，页面正文不上传。自定义外部操作排在菜单最后，`url` 支持三个已 URL 编码的占位符 `{url}` `{title}` `{markdown_url}`：

```yaml {title="hugo.yml"}
params:
  ui:
    page_context_menu:
      links:
        - name: 询问内部助手
          icon: fa-solid fa-wand-magic-sparkles
          url: https://assistant.example.com/new?source={markdown_url}&title={title}
```

在博客根分区及其一级子分区上，左半边变成 RSS 订阅链接。没有 Markdown 输出的页面去掉左半边，箭头变成带文字的「操作」按钮。这些操作同时是命令面板里的条目。

### 翻页器 {#pager}

正文末尾上/下一页是文本链接，顺序与侧栏可见树一致：根页 → 第一篇 → 最后一篇。站点提供 `data/docs_nav.json` 时这棵显式树同时决定翻页顺序与栏目索引顺序。

```yaml {title="hugo.yml"}
params:
  ui:
    pager_types: [docs, book, blog]
```

`pager_types` 只接受 `docs`、`book`、`blog`，其它取值告警丢弃。单页退出用 front matter `pager: false`。同一顺序写进 `<head>`：有上/下一页时输出 `<link rel="prev">` 与 `<link rel="next">`。翻页只在 HTML 输出生效，打印、Markdown 与 RSS 没有。翻页器是页尾四件套的第三件（反馈 → 页面信息 → 翻页 → 评论）。

### 反向链接 {#backlinks}

右栏列出有哪些页面链接到本页：带链接图标的「反链」组，排在目录下方、分类标签云上方，默认展开；低于 `xl` 断点时随目录进入侧栏抽屉。默认关闭，由站点打开 `params.ui.backlinks: true`（单页用 front matter、分区用 cascade 覆盖）。

索引在构建时从页面源码的普通 Markdown 链接与 `ref`/`relref` shortcode 派生；扫描前剥掉代码围栏与行内代码；同目标多链接合并；自链接、外链、`mailto:` 与同页锚点不计入；判断目标时去掉 fragment；每种语言各一张图。条目按稳定页面路径排序；无入链时整个区块不渲染。前八条直接可见，其余折进原生「再显示 N 条」disclosure（不涉及 JS）。写在自定义 shortcode 参数或原始 `<a href>` 里的 URL 不会成为边。非布尔取值告警并回落关闭。Markdown 输出带同一份列表（前缀「反链：」），RSS 省略，`print` 连同整个右栏省略。

### 页脚 {#footer}

页脚形态由 `params.ui.footer_style` 决定。`fat` 的多列链接网格读 `data/footer/<语言>.yaml`（不是菜单，主题没有 `menus.footer`）：

```yaml {title="data/footer/zh.yaml"}
brand:
  name: 产品文档
  tagline: 一段简短的**支持 Markdown 的**说明。
  slogan: 贴近产品，给出明确答案。
columns:
  - title: 文档
    links:
      - { label: 快速上手, url: /zh/docs/start/ }
      - { label: 组件, url: /zh/docs/components/ }
  - title: 项目
    links:
      - { label: GitHub, url: https://github.com/pgsty/oink, external: true }
      - { label: 发布记录, url: /zh/blog/release/ }
```

- `brand.name` 与 `brand.logo` 不写时回落站点品牌名、Logo 与字标；`tagline` 与 `slogan` 渲染 Markdown。
- 站内 `url` 相对当前语言根解析；`external: true` 新标签页打开并带 `rel="noopener noreferrer"`。网格列数等于数据里的列数；单语言站可用 `data/footer.yaml`。
- 配了 `fat` 但无数据时自动降级成 `slim`。`fat` 页脚版权行右端有折叠箭头，选择存 localStorage 的 `td-footer-collapsed` 键。
- 只要页脚有渲染，最底层栏右侧固定保留版本、语言、主题、快捷键帮助四个图标；版本按钮只显示分支图标。`footer_style: none` 连同底栏一起移除。

导航验证：`hugo --printPathWarnings --panicOnWarning`；确认无三层菜单警告；桌面父级菜单点击进父页/悬停展开/Esc 关闭；缩到 `lg` 以下每个顶层入口仍有图标；缩到 `md` 以下只剩搜索与抽屉按钮；切换器列出所有顶级栏目且当前项有标记；文档页按 E/Q 翻页顺序与侧栏一致且源码有 `rel`；反链有 `td-backlinks` 标记而无人链页面没有。

## 布局与页面类型 {#layout}

规则是**外壳看 `type`，不看路径**：文档可放 `content/` 任意位置，只要给它 `type: docs`。

### 外壳类型 {#shell-types}

```yaml {title="hugo.yml"}
params:
  ui:
    shell_types: [docs, book, blog, swagger]
```

| type | 外壳 |
| --- | --- |
| `docs` | 文档外壳：左侧栏（栏目切换器 + 目录树）+ 正文 + 右栏大纲 |
| `book` | 文档外壳，另加编号目标、`reading_width` 阅读行宽与草稿横幅 |
| `blog` | 文档外壳，侧栏默认展开，标题行左半边是 RSS |
| `swagger` | 文档外壳，正文交给 Swagger UI 或 Redoc |
| 其它 type | 普通页面：顶栏 + 单栏正文 + 页脚，无侧栏 |

分类页与标签页（`taxonomy`/`term`）也走同一套外壳。给子树指定 type 用 cascade：

```yaml {title="content/handbook/_index.md"}
---
title: 运维手册
type: docs
cascade:
  type: docs
---
```

### 栏目根只是导航起点 {#sections}

```yaml {title="hugo.yml"}
params:
  ui:
    docs_section: docs
    blog_section: blog
```

这两个键**不决定外壳**，只告诉主题文档树与博客树的根在哪，用于解析侧栏根、快捷入口与默认图标。让 docs 页侧栏根变成站点首页：`params.ui.docs_sidebar_root: home`（取值只有 `home`/`section`，其它值告警并使用 `section`）。

### 文档挂在站点根 {#docs-at-root}

以文档为主的站点可把 `docs` 分区发布到 URL 根路径，源码仍在 `content/docs/` 下。三段配置：

```yaml {title="hugo.yml"}
permalinks:
  page:
    docs: /:sections[1:]/:slug/
  section:
    docs: /:sections[1:]
```

```yaml {title="content/_index.zh.md"}
---
title: 产品文档
build: { render: link }
---
```

```yaml {title="hugo.yml"}
params:
  ui:
    sidebar_root_enabled: true
    docs_sidebar_root: home
```

`docs_sidebar_root: home` 后站点首页所有顶层分区进入这棵树；博客、社区、下载等概览分区在自己的 `_index.md` 里设 `toc_root: true` 退出（不出现在树里也不成为翻页目标）。构建加 `--printPathWarnings`，发布前解决所有重复目标。

### 落地页 {#landing}

任意页面加 `layout: landing` 即用落地页布局：顶栏 + 分区拼装正文 + 页脚，无侧栏。`params.ui.landing_search: false` 把搜索入口从落地页外壳去掉，其它页面不受影响。

### 侧栏 {#sidebar}

侧栏树来自 `content/` 目录结构，按 `weight` 排序，有 `linkTitle` 时用它作标签。可调密度与尺寸：

```yaml {title="hugo.yml"}
params:
  ui:
    sidebar_menu_compact: true
    sidebar_menu_foldable: true
    sidebar_menu_truncate: 2000
    sidebar_width_min: 220
    sidebar_width_max: 480
    sidebar_item_overflow: ellipsis # ellipsis | wrap
    sidebar_expand_levels: 2
```

- `sidebar_menu_compact` 只展开当前分支及邻近条目；`false` 时整棵全展开。
- `sidebar_menu_foldable` 允许读者展开/折叠；博客栏目默认展开，某分区默认收起写 `sidebar_expanded: false`。
- `sidebar_expand_levels` 是默认展开层级数；`sidebar_menu_truncate` 是单分区最多渲染条目数。
- `sidebar_width_min`/`max` 是桌面拖拽调宽上下限（像素），宽度存本地，双击分隔条恢复默认。
- `sidebar_item_overflow` 默认 `ellipsis`，中文长标题多的站点可改 `wrap`。
- 达到 `sidebar_cache_limit` 后有相同有效设置的页面可共享中性渲染树；小于 `md` 时侧栏变带遮罩的抽屉。
- 单页去掉侧栏用 front matter `sidebar_enabled: false`。

#### 显式导航树 data/docs_nav.json {#docs-nav}

默认从 `content/` 推导。三个条件同时成立时改用 `data/docs_nav.json`：文件存在且有 `sections` 键；页面 type 是 `docs` 或 `book`；解析出的侧栏根不是站点首页。

```json {title="data/docs_nav.json"}
{
  "sections": [
    {
      "page": "/docs/start",
      "url": "/docs/start/",
      "children": [{ "page": "/docs/start/install", "url": "/docs/start/install/" }]
    }
  ],
  "active_path_by_url": {
    "/docs/start/install/": ["/docs/start/"]
  }
}
```

`page` 指向内容路径，`url` 是链接，`children` 是子节点；`active_path_by_url` 记录每个 URL 的祖先链供高亮。这些路径不带语言前缀与 baseURL 部署子路径（1.1 起比较前去掉两种前缀）。这棵树同时决定翻页顺序。`sections` 为空数组时告警回退内容树；`page` 指向不存在页面时告警跳过。带 `manual_link` 的占位节点与 `sidebar_divider` 分隔行留在侧栏但不成为翻页目标。适用于导航顺序由外部工具生成（如从 Sphinx toctree 迁移）的站点。

#### 侧栏图标密度 {#sidebar-icons}

```yaml {title="hugo.yml"}
params:
  ui:
    sidebar_icon_policy: groups # all | groups | none
```

`all` 每个有图标的条目都显示（兼容默认值）；`groups` 只有根和有子页的节点显示；`none` 不显示。非法取值只告警回落 `all`。

#### 在侧栏里展开标题 {#sidebar-headings}

```yaml {title="hugo.yml"}
params:
  ui:
    sidebar_headings: 3 # false | true | 2 | 3 | 4
```

只对 `type: book` 页面生效，在侧栏当前行下展开 h2–h4 分支。整数指定层级（2–4），`true` 等于 2，`false` 关闭。超出范围时告警并关闭标题分支。

### 目录 TOC {#layout-toc}

右栏大纲由 Hugo 从 Markdown 标题生成：

```yaml {title="hugo.yml"}
markup:
  tableOfContents:
    startLevel: 2
    endLevel: 4
    ordered: false
```

普通外壳运行时始终跟踪当前标题；大纲绘制连续轨道、高亮当前区段并标出位置。读者可整体折叠右栏，状态存本地；小于 `xl` 时右栏隐藏，内容移进侧栏抽屉。旧的 `params.ui.scroll_spy` 与页面键 `scroll_spy` 在整个 1.x 仍作为静默 no-op 接受。单页隐藏大纲用 `notoc: true`。只有进入 Hugo 目录的标题才出现在大纲里：Markdown 型 shortcode（`{{% … %}}`）输出的标题会进，普通 shortcode（`{{< … >}}`）通常不会。

### 栏目首页样式 {#section-index}

带 `_index.md` 的分区自动列出子页，两种样式：

```yaml {title="hugo.yml"}
params:
  ui:
    section_index: cards # list | cards
    section_index_columns: 2
```

- `list`（默认）：每个子页一个标题 + 描述段落；
- `cards`：网格卡片，读子页 `title`（或 `linkTitle`）、`description` 与 `icon`。

可按分区覆盖：

```yaml {title="content/docs/components/_index.md"}
---
title: 组件
section_index: cards
section_index_columns: 3
---
```

页面级开关：`no_list: true` 不列子页；`simple_list: true` 只输出无描述的项目符号列表；子页设 `hide_summary: true` 把自己从列表去掉。不要手写子页清单（会与侧栏失同步）。

### 页宽与顶栏/页脚开关 {#layout-page-width}

`params.page_width`（`normal`/`wide`/`full`）可逐页或按分区覆盖；Book 页另有 `reading_width`。顶栏与页脚属逐页布局决定，写在 front matter **顶层**（不在 `ui` 下），可用分区 cascade 一次设定：

```yaml {title="content/docs/_index.md"}
---
title: 文档
cascade:
  navbar_enabled: false
  footer_style: slim
---
```

## 页面级 front matter 速查 {#frontmatter-refs}

| 键 | 作用 |
| --- | --- |
| `page_width` / `reading_width` | 覆盖外壳宽度 / Book 正文行宽 |
| `navbar_enabled` / `navbar_autohide` | 关闭 / 自动隐藏顶栏 |
| `footer_style` | 页脚形态 |
| `reading_time` | 显示阅读时长 |
| `notoc: true` | 隐藏右栏大纲 |
| `pager: false` | 退出翻页器 |
| `sidebar_enabled: false` / `sidebar_expanded: false` | 去掉侧栏 / 分区默认收起 |
| `sidebar_root_for` / `sidebar_root_link_self` / `sidebar_root_menu` | 自成一棵侧栏树 / 链接自身 / 排除切换器 |
| `toc_root: true` | 退出文档树与翻页序列 |
| `section_index` / `section_index_columns` | 栏目首页样式 |
| `theme_color` / `theme_color_dark` | 分区强调色；`false` 退出 |
| `layout: landing` / `landing` / `sections` | 落地页 |
| `image_zoom` / `comments` / `backlinks` / `translation_notice` | 逐页覆盖对应开关 |
| `upstream_link` 一族 | 上游署名 |
| `icon` | 侧栏与菜单图标 |
| `no_list` / `simple_list` / `hide_summary` | 子页列表行为 |
| `build.render: link` / `build.render: never` | 站点根索引 / 隐藏根 |
