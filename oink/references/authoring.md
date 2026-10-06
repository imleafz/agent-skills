# 创作内容：页面、书籍、博客、发布与 API

来源：<https://oink.pgsty.com/zh/docs/write/>（OINK v1.2.0 文档）

## 一页文档的构成

页面是 `content/` 下的 Markdown 文件，URL 由位置决定：`content/docs/install.md` → `/docs/install/`；中文译文是同目录的 `install.zh.md`，共享同一逻辑路径。

带资源的页面改用**页面包**（page bundle）：目录 + `index.md`，资源同放。

```filetree {title="content/ 里的两种页面形态"}
- content/
  - docs/
    - _index.md              # 栏目首页
    - install.md             # 单文件页面 → /docs/install/
    - install.zh.md          # 中文译文
    - anatomy/               # 页面包 → /docs/anatomy/
      - index.md
      - index.zh.md
      - shell.webp           # 页面资源，两种语言共用
```

> [!IMPORTANT]
> 中文页没有英文对等页时，无语言后缀的资源不会分给它；此时资源名要带 `.zh.`（`shell.zh.webp`），正文里仍写 `shell.webp`。

```bash
hugo new content docs/install.md    # 用 archetype 生成带 front matter 的空文件；手写同样可行
```

## 必写 front matter

```yaml {title="content/docs/install.zh.md"}
---
title: 安装 Pigsty          # 页面大标题、浏览器标题、搜索结果标题
linkTitle: 安装             # 侧栏与面包屑短名，省略时用 title
description: 在一台干净的 EL 9 机器上装出可用的 PostgreSQL 集群。
weight: 20                  # 同级排序，用 10 的倍数
---
```

## 标题层级与稳定锚点

正文从 `##` 开始分节，`#` 留给 `title`（主题已渲染页面大标题）。右栏目录从 `##` 收，深度由 `markup.tableOfContents` 决定。每个 `##`/`###` 手写英文锚点：

```markdown
## 前提条件 {#prerequisites}

### 磁盘与内存 {#disk-and-memory}
```

理由：中英对齐（译文标题写英文页的 ID 才是同一片段，翻译审计才可比对）；链接稳定（标题措辞会变，显式 ID 一旦发布即公开路由）。需要改名时保留旧锚点：

```markdown
## 快速开始 <a id="get-started"></a> {#quickstart}
```

ID 用短横线小写英文，全页唯一。

## 链接写法

| 写法 | 例子 | 何时用 |
| --- | --- | --- |
| 站内绝对路径 | `[配置总览](/zh/docs/customize/config/)` | 默认。指向已发布路由，便于审计与全站替换 |
| 相对路径 | `[另一页](../organize/)`、`![图](shell.webp)` | 同页面包资源，或有意跟随源码目录的相邻页 |
| `ref`/`relref` | `[配置总览]({{< ref "/docs/configure/overview" >}})` | 需要构建期校验目标存在；缺目标即构建失败 |

三种写法都带尾部斜杠。主题没有链接渲染钩子，链接原样交给 Goldmark：外链不会自动 `target="_blank"`。普通 Markdown 链接不做存在性检查，故站内链接优先写绝对路径；移动页面时给旧路径加 `aliases` 并同步改站内链接；拿不准的目标用 `ref`。双语页面链接逻辑页面（`/zh/docs/write/pages/`），不要链 `.zh.md`；片段 ID 保持语言中立。

## 图片位置

页面自己的截图放页面包，多页共用图放 `assets/images/`，不需处理的大文件放 `static/`。三处源码都写 `![替代文字](来源)`，属性行控制图注/尺寸/缩放/编号（见 `components-content.md` 的图片一节）。

## 草稿与发布

`draft: true` 不进构建产物；`hugo server -D` 预览草稿，`-F` 预览未来日期。生产构建 `hugo` 默认只发布已定稿内容。

## 页尾的自动内容

页面末尾四块由主题按固定顺序生成，不必手写：反馈（默认关）→ 最后修改（有 Git 信息时开）→ 翻页器（docs/book/blog 开）→ 评论（giscus，配置完整且开启时）。标题旁操作菜单（复制 Markdown、编辑本页、查看历史、提 issue、打印）同样自动。

单页关闭：`feedback: false`、`annotation: false`、`pager: false`、`comments: false`。

## Markdown 扩展一览

| 组件 | 最短语法 | 参考 |
| --- | --- | --- |
| 提示块 | 块引用首行 `> [!NOTE]` | components-content.md |
| 标签页 | 相邻两个围栏各加 `{tab="Homebrew"}` | components-content.md |
| 步骤 | 有序列表后跟一行 `{.steps}` | components-content.md |
| 卡片 | 链接列表后跟一行 `{.cards}` | components-content.md |
| 参数表 | 表格后跟 `{.fields meta="type default"}` | components-content.md |
| 表格增强 | 表格后跟 `{.matrix}` / `{caption="…"}` | components-content.md |
| 代码块 | 围栏信息行 `{title="hugo.yml" copy=false}` | components-content.md |
| 图片 | 独立成段的图片后跟 `{caption="…" width="600"}` | components-content.md |
| 文件树 | `filetree` 围栏 | components-content.md |
| 公式 | `math` 围栏或 `$$` 块 | components-visual.md |
| 图表 | `mermaid`/`plantuml`/`markmap`/`echarts` 围栏 | components-visual.md |

少数组件（徽章、按键、引用文件、终端录像、Book 图表式例）用 shortcode。

---

# 组织内容：目录即侧栏

OINK 不配置导航：`content/` 的目录结构就是侧栏树。一个目录是一个 section，`weight` 决定顺序，标签取 `linkTitle`（缺省 `title`）。

## 每个目录都要有 `_index.md`

缺 `_index.md` 时 Hugo 仍生成栏目，但无标题/描述/图标/weight，侧栏显示目录名且排序不受控。

```yaml {title="content/docs/deploy/_index.zh.md"}
---
title: 部署上线
linkTitle: 部署
description: 把站点发布到 GitHub Pages、Cloudflare Pages 或自己的 Nginx。
weight: 50
icon: fa-solid fa-cloud-arrow-up
---
```

栏目 `_index.md` 专属能力：`cascade` 把共享设置一次下推整棵子树。

```yaml {title="content/docs/reference/_index.zh.md"}
---
title: 参考
weight: 90
cascade:
  pager: false        # 子树内页面都不显示上一页/下一页
  search_boost: 0.8
---
```

## 排序

同栏目按 `weight` 升序，相同才退回日期与 `linkTitle` 字母序。一律用 10 的倍数。没写 `weight` 视为 0，会排到最后且顺序随内容漂移，因此每页都写。栏目自身 `weight` 决定它在父级的位置。

## 栏目首页样式

`_index.md` 正文后主题自动接上子页索引：`params.ui.section_index: list | cards`（默认 `list`）。`cards` 读子页的 `icon`/`linkTitle`/`description`。单栏目覆盖：`section_index: list`，或用 `cascade` 连同后代。两个不受样式影响的开关：`simple_list: true` 渲染紧凑项目符号列表；`no_list: true` 不生成索引。

## 侧栏图标

```yaml
icon: fa-solid fa-cloud-arrow-up
```

密度策略：`params.ui.sidebar_icon_policy: all | groups | none`（`all` 兼容默认；`groups` 只有根节点和有子页的节点显示图标；`none` 全不显示）。新站建议显式 `groups`。

## 展开与折叠

有子页的栏目带折叠箭头。默认当前页路径展开、其余收起，博客类栏目默认展开。栏目可 `sidebar_expanded: true` 始终展开。站点级折叠/紧凑/初始展开层数/宽度/截断在 `site-configuration.md` 配。

自 OINK 1.1 起提供 `window.OinkSidebar` API（站点代码在主题脚本之后加载，先等 `ready`）：

```javascript
const sidebar = window.OinkSidebar;
if (sidebar) {
  sidebar.ready.then(() => {
    const button = document.querySelector('#td-shell-sidebar [data-td-shell-tree-toggle]');
    if (!button) return;
    sidebar.setExpanded(button.getAttribute('aria-controls'), true);
  });
}
```

`getState(id)` 返回 `{id, expanded}` 或 `null`；状态变化在 `document` 上触发 `oink:sidebar-disclosure`（detail `{id, expanded, source}`）。主题不保存单个分支偏好，站点自己持久化时存储键要区分语言与导航版本。

## 从侧栏藏起来

| front matter | 效果 |
| --- | --- |
| `toc_hide: true` | 不出现在侧栏树与翻页序列（页面照常发布） |
| `hide_summary: true` | 不出现在父栏目首页子页索引 |
| `sidebar_divider: true` | 这一项是分组标题而非链接 |
| `manual_link: https://…` | 侧栏这一行指向别处；配 `manual_link_title`、`manual_link_target: _blank` |

## 只分组、不发布目录页

自 1.1 起，分隔分区保留子页，同时标题不再跳转：

```yaml
---
title: Reference
sidebar_divider: true
build:
  render: never
---
```

子页仍进入翻页、搜索、导航 JSON 与 Print。省略 `build` 则继续发布分区页面。

## 外壳由 `type` 决定，不是路径

文档外壳取决于 `type` 是否在 `params.ui.shell_types`（默认 `[docs, book, blog, swagger]`）。文档可放任意路径，用 cascade 指定 `type`：

```yaml {title="content/handbook/_index.zh.md"}
---
title: 运维手册
type: docs
sidebar_root_for: self      # 侧栏树的根即本栏目，不回退到 /docs
cascade:
  type: docs
---
```

> [!IMPORTANT]
> 文档目录不叫 `docs` 时，除 `type: docs` 外还要 `sidebar_root_for: self`，否则侧栏会按 `params.ui.docs_section`（默认 `docs`）找根，读者在 `/handbook/` 看到 `/docs/` 的树。

## 多根侧栏

```yaml {title="content/docs/api/v2/_index.zh.md"}
---
title: API 参考 v2
sidebar_root_for: self   # self | children
---
```

`self`：栏目首页及全部后代以它为侧栏根；`children`：首页留在父树，仅后代以它为根。树上方切换器列出所有顶层栏目加所有 `sidebar_root_for: self` 的栏目，只有一个入口时退化为普通链接。`sidebar_root_menu: false` 把某根排除出切换器候选；`sidebar_root_link_self: false` 让根那一行指向父栏目。

---

# 页面参数（front matter）全表

优先级：页面 front matter > 最近一层 `cascade` > 站点参数。页面键一律写顶层，键名是站点键去掉 `ui.` 前缀（`params.ui.section_index` → `section_index`）；写进 `ui:` 段不会被读取。非法值不中断构建：主题发警告并回退到默认值渲染（`--panicOnWarning` 构建仍是硬失败）。放进 `cascade` 时键名不变，多包一层。

## 基本

| 键 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `title` | 字符串 | — | 页面大标题、浏览器标题、搜索结果标题。每页必写 |
| `linkTitle` | 字符串 | `title` | 侧栏、面包屑、翻页器、卡片短名 |
| `description` | 字符串 | — | 一句话摘要：栏目卡片、搜索摘要、`meta description`；博客页里是正文上方导语 |
| `weight` | 整数 | `0` | 同级排序，用 10 的倍数；不写排最后 |
| `draft` | 布尔 | `false` | 草稿不进构建产物 |
| `date` | 日期 | — | 博客日期、发布页排序；未来日期默认不构建 |
| `lastmod` | 日期 | Git 提交时间 | 页尾「最后修改」；启用 `enableGitInfo` 时不必手写 |
| `aliases` | 字符串数组 | — | 旧路径重定向到本页 |
| `type` | 字符串 | 顶层目录名 | 决定模板与外壳：`docs`/`book`/`blog`/`swagger` |
| `layout` | 字符串 | — | 单页布局：`landing`、`releases` |
| `cascade` | 映射 | — | 把键下推给整棵子树 |

## 侧栏与导航

| 键 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `icon` | Font Awesome class 对 | — | 例如 `fa-solid fa-rocket` |
| `toc_hide` | 布尔 | `false` | 不进侧栏树与翻页序列 |
| `hide_summary` | 布尔 | `false` | 不进栏目首页子页索引 |
| `sidebar_divider` | 布尔 | `false` | 无链接分组标题，不进翻页序列 |
| `sidebar_expanded` | 布尔 | blog `true`，其余 `false` | 栏目默认展开 |
| `sidebar_root_for` | `self`/`children` | — | 让栏目成为侧栏树的根 |
| `sidebar_root_link_self` | 布尔 | `true` | 根那行链接自身；`false` 链父栏目 |
| `sidebar_root_menu` | 布尔 | `true` | 是否进入全站切换器候选 |
| `toc_root` | 布尔 | `false` | 根是站点首页时，整个顶层栏目排除出树与翻页 |
| `manual_link` / `manual_link_relref` | URL/内容引用 | — | 侧栏与栏目索引这一行指向别处 |
| `manual_link_title` / `manual_link_target` | 字符串 | `title`/— | 手动链接标题/目标 |
| `no_list` | 布尔 | `false` | 栏目首页不生成子页索引 |
| `simple_list` | 布尔 | `false` | 子页索引渲染成紧凑项目符号列表 |
| `section_index` | `list`/`cards` | 站点值（`list`） | 子页索引样式 |
| `section_index_columns` | 整数 | `2` | 卡片列数 |
| `notoc` | 布尔 | `false` | 不显示右栏目录 |
| `pager` | 布尔 | 由 `params.ui.pager_types` 决定 | `false` 关本页上一页/下一页 |
| `navbar_enabled` / `navbar_autohide` | 布尔 | 站点值 | 本页是否渲染顶栏/自动隐藏 |
| `breadcrumb` | 布尔 | 按外壳 | Docs/Book 默认开，Blog 默认关 |
| `theme_color` / `theme_color_dark` | 十六进制色 | 站点值/派生 | 本页强调色 |
| `page_context_menu` | 布尔 | 站点值（`true`） | 标题行页面操作菜单 |
| `page_context_menu.assistant_links` | 布尔 | 站点值（`false`） | ChatGPT/Claude 交接项 |

## 页面外壳

| 键 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `page_width` | `normal`/`wide`/`full` | `normal` | 正文栏宽度 |
| `reading_width` | `slim`/`normal`/`wide` | `normal` | Book 阅读行宽，仅 `type: book` |
| `footer_style` | `fat`/`slim`/`none` | 站点值（`fat`） | 页脚形态 |
| `body_class` | 字符串 | — | 追加到 `<body>` 的 class |
| `reading_time` | 布尔 | 站点值 | 是否显示阅读时长 |
| `sidebar_enabled` | 布尔 | `true` | 是否显示左侧栏 |
| `keyboard_nav` | 布尔 | 站点值（`true`） | 单键键盘导航 |
| `lastmod_commit` | `subject`/`hash`/`none` | `subject` | 「最后修改」后怎么显示提交 |
| `sidebar_expand_levels` / `sidebar_menu_compact` / `sidebar_menu_foldable` / `sidebar_item_overflow` | 同站点参数 | 站点值 | 侧栏行为逐页覆盖 |
| `sidebar_width_min` / `sidebar_width_max` | 正整数 | 站点值（`220`/`480`） | 本页桌面侧栏拖拽宽度上下限 |
| `code_copy` | 布尔 | 站点值（`true`） | 本页代码块复制控件默认值 |
| `toc_style` | `fixed`/`flow` | 站点值（`fixed`） | 固定右栏或内容流右栏 |
| `toc_taxonomies` | 布尔 | 站点值（`true`） | 分类词云是否与目录同进右栏 |
| `taxonomy_icons` | map | 站点值 | 覆盖各分类法图标 |

## 搜索

| 键 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `search_keywords` | 字符串或数组 | — | 附加检索词（中英文与同义词） |
| `search_boost` | 正数 | `1.0` | 排序乘数 |
| `search_exclude` | 布尔 | `false` | 不进本地索引 |

## 输出形态

| 键 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `outputs` | 字符串数组 | 站点 `outputs` | 本页生成哪些输出；写 `[HTML]` 即不再生成 `.md` |
| `no_print` | 布尔 | `false` | 不进整章/整本聚合打印 |

## 页尾：评论、反馈与出处

顺序固定：反馈 → 出处 → 翻页器 → 评论。

| 键 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `comments` | 布尔 | 站点 `params.comments.enable`（`false`） | 是否显示 giscus 评论区 |
| `feedback` | 布尔或映射 | 站点值（关） | 映射支持 `enable` 与 `reasons` |
| `annotation` | 布尔 | 站点值（开） | 页尾「最后修改/出处」区块 |
| `backlinks` | 布尔 | 站点值（关） | 右栏目录旁显示反链组 |
| `translation_notice` | 语言代码或 `false` | 站点值（关） | 译文指回原文的说明 |
| `image_zoom` | 布尔 | 站点值（`false`） | 本页图片是否可点击放大 |

### 上游出处

页面改写自别处材料时用 `upstream_link` 声明来源。解析顺序：站点参数 → `data/upstreams` 中由 `upstream_source` 指名的条目 → 本页 front matter，最具体者胜。`upstream_link` 只从 front matter 读（cascade 有效，站点参数无效）。四个必填键缺一即警告并略去整条署名：`upstream_name`、`upstream_copyright`、`upstream_license`（SPDX，须能在 `data/licenses` 查到）、`upstream_notice`；可选 `upstream_ref`、`upstream_modified`。

## 博客与文章

| 键 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `author` | 字符串 | — | 文章署名，支持行内 Markdown；写了 `authors` 时忽略 |
| `authors` | 字符串数组 | — | `authors` taxonomy 的 term，顺序即署名顺序 |
| `series` | 字符串数组 | — | `series` taxonomy 的 term，正文上方取第一个系列横幅 |
| `series_weight` | 整数 | — | 系列中的位置 |
| `tags` / `categories` | 字符串数组 | — | 分类体系 |
| `images` | 字符串数组 | — | 第一项作为封面与分享卡片；`images: []` 不继承 cascade 值 |
| `byline` | 字符串 | — | 题图署名 |
| `featured_image` | `none`/`banner`/`wash`/`hero` | 站点值（`none`） | 正文里怎么渲染题图 |
| `blog_index` | `list`/`cards`/`table` | 站点值（`list`） | 博客根目录索引形态；`table` 不分页 |
| `blog_index_columns` / `blog_index_size` / `blog_index_toggle` | 整数/布尔 | 站点值 | 卡片列数/每页文章数/三种形态切换 |
| `share` | 数组或 `false` | 站点 `params.ui.share`（空） | 页尾分享目标，整体替换继承列表 |
| `summary` | 字符串 | — | 标签/分类页文章行摘要回退，`description` 优先 |

## Book

| 键 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `book_number` | 字符串 | — | 章节编号，显示在标题与侧栏条目前 |
| `book_status` | `draft` | — | 草稿章节标记，索引里默认不列 |
| `sidebar_headings` | `false`/`true`/2–4 | 站点值（`false`） | 侧栏当前条目下展开 h2–h4 |
| `book_draft_banner` | 布尔 | 站点值（`false`） | 草稿章节正文开头加横幅 |

## Landing

| 键 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `landing` | 字符串 | — | 数据取 `data/landing/<key>/<语言>.yaml` |
| `sections` | 数组 | — | front matter 内联分区定义，优先于 `landing` |

## 发布页

| 键 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `release_url` | 字符串 | — | 精确标签的 GitHub 发布地址，解析出项目/标签/日期/资产 |

---

# 博客与文章

文章与文档正文写法相同，区别在外壳：带日期/作者/标签/封面，列表按年份倒序，栏目带 RSS。`type: blog` 使栏目使用博客外壳；不要建年份目录，年份分组自动生成。

```yaml {title="content/blog/_index.zh.md"}
---
title: 博客
description: OINK 工程实践与发布注记
type: blog
icon: fa-solid fa-blog
sidebar_root_for: self
cascade:
  type: blog
  feedback: false
  comments: true
---
```

`params.ui.blog_section`（默认 `blog`）指明博客根。侧栏里博客默认展开、条目按日期倒序；给文章写 `weight` 可固定在最前。

文章 front matter 与文档不同的几点：`date` 必填（决定列表位置、年份分组与 RSS 时间）；`description` 渲染成正文上方导语；`author` 支持行内 Markdown。日期格式由 `params.time_format_blog` 决定，可按语言分别设置。

## 封面图

列表页与标签页每行左侧缩略图按顺序解析，第一个命中生效：文章 `images` 第一项 → 页面包里文件名含 `featured` 的图片 → 祖先栏目 cascade 继承的 `images`。栏目级默认用 cascade：`cascade: { images: [/images/releasenote.webp] }`；单篇不要写 `images: []`。站点级 `params.images` 只做分享卡片，不渲染成列表缩略图。

`params.ui.featured_image`（页面键 `featured_image`）让主题把同一解析结果渲染进正文：`none`（默认）/`banner`（16:9 图）/`wash`（图铺文章头背后渐隐）。可用 cascade 只对某棵树打开。

## 列表与 RSS

栏目 `_index.md` 正文后主题自动接文章列表，按年份分组倒序，每条显示标题/日期/子栏目/标签/缩略图/250 字摘要。分页用 Hugo 原生：`pagination.pagerSize`（默认 10）。`params.ui.blog_index: cards` 换成卡片网格（`blog_index_columns` 只在 xl 断点以上生效）。

Feed 由 `outputs` 决定：

```yaml
outputs:
  home: [HTML, markdown, LLMS]
  page: [HTML, markdown]
  section: [HTML, RSS, print, markdown]
```

`outputs` 一旦写出就整体替换 Hugo 默认值，`RSS` 必须显式写回。栏目 Feed 递归包含子栏目文章；每种语言各自 Feed，地址是语言路由 + `index.xml`。全站不要 Feed 用 `disableKinds: [RSS]`。

## 作者与系列

声明 taxonomy 就是全部开关：

```yaml
taxonomies:
  category: categories
  tag: tags
  author: authors
  series: series
```

文章写 `authors: [vonng, ada-example]`，头部按顺序渲染头像与链接名字。作者主页就是 term 页 `content/authors/vonng/_index.md`（显示名取 `linkTitle`，否则 `title`；`description` 一句话，正文长介绍，头像走题图解析规则）。

系列：文章写 `series: [shell-internals]` 与 `series_weight: 20`，正文上方出现系列横幅（系列名、第几篇、下一篇、可折叠完整列表），term 页 `content/series/<name>/_index.md` 是引言。阅读顺序由主题计算：带权重的按 `series_weight` 升序在前，其余按日期升序跟随。一篇文章属于多系列只显示写在最前的那个；只有一篇的系列不显示横幅。

## 分享

`params.ui.share` 在页尾最前放分享栏（顺序即渲染顺序，默认空）：

```yaml
params:
  ui:
    share: [x, bluesky, mastodon, reddit, hackernews, email, copy]
```

可选 16 个目标：`x`、`bluesky`、`mastodon`、`facebook`、`linkedin`、`reddit`、`hackernews`、`telegram`、`whatsapp`、`line`、`pinterest`、`weibo`、`chatgpt`、`claude`、`email`、`copy`。页面键 `share` 可 cascade，`share: false` 单页退出。每个目标都是纯 `<a href>` intent 链接，不带平台 SDK/iframe/计数/投放参数。

---

# 书籍出版

一本书是 `type: book` 的内容树：目录决定章节顺序，front matter 决定编号，图/表/式/例各带手写编号与稳定锚点，交叉引用在四种输出里都解析，书根可生成整本打印 HTML。

前提：Goldmark 已开属性行与 passthrough；`params.ui.shell_types` 保留 `book`。

```filetree {title="content/handbook/ 一本书"}
- content/handbook/
  - _index.md              # 书首页：type: book + cascade，放 book-toc 与各类索引
  - ch01/
    - _index.md            # 章首页：book_number: 1
    - install.md           # 1.x 节
  - ch02/
    - _index.md            # book_number: 2
    - replication.md
  - appendix.md            # 不编号附录，照样进侧栏与翻页
```

编号手写：`book_number` 写什么显示什么；图/表/式/例的 `num` 同样是作者掌握的字符串（`2-1`、`5.3`、`A-2`），重排目录不会让已印出的编号漂移。

```yaml {title="content/handbook/_index.md"}
---
title: PostgreSQL 运维手册
type: book
book_number: B
cascade:
  type: book
outputs: [HTML, print, markdown]
---
```

分区书对应 Hugo `section` 输出类型，书在站点根时才用 `home`。`book_status: draft` 是可见的编辑状态标签，不改变 Hugo 发布状态。

## 编号：原生形态

一个 Markdown 块紧跟一行属性行；`num=` 编号，`#id` 锚点，`caption=` 纯文本题注。属性行必须紧贴块，中间不能有空行。

````markdown
![OINK 发布注记页面](/images/releasenote.webp)
{#book-release-note num="2-1" caption="发布注记页面同时是发布事实的唯一来源。" width=600 height=300}

| 隔离级别 | 脏读 | 不可重复读 |
| --- | --- | --- |
| Read Committed | 不可能 | 可能 |
{#tbl-2-1 num="2-1" caption="PostgreSQL 各隔离级别下的异常现象。"}

$$
A = \frac{\mathrm{MTBF}}{\mathrm{MTBF} + \mathrm{MTTR}}
$$
{#eq-2-1 num="2-1" caption="可用性与平均故障间隔、平均恢复时间的关系。"}

```sql {num="2-1" caption="按天统计主库写入量。" #eg-2-1}
SELECT date_trunc('day', ts) AS day, count(*) FROM pg_stat_statements_history GROUP BY 1;
```
````

默认 ID：`fig-<num>` / `tbl-<num>` / `eq-<num>` / `eg-<num>`。原生图依赖 `wrapStandAloneImageWithinParagraph: false`；原生式依赖 passthrough。例的题注必填。

## 编号：shortcode 形态

`fig` `tbl` `eq` `eg` 渲染同样的 `<figure>`，仅在原生做不到时用（外链图片、一个编号下多张表、未开 passthrough、例子含多个围栏加说明）。`eq` 走本地服务端 KaTeX，不依赖 passthrough；`{{< eq >}}` 无参是块级公式兜底。

```markdown
{{< fig num="2-2" src="/images/docsy.webp" alt="Docsy 主题的默认外壳"
    caption="OINK 的上游：Docsy 的内容模型仍在下面。" width="600" height="300" />}}

{{< tbl num="2-2" caption="四种输出下编号组件的形态。" >}}
| 输出 | 标签 | 锚点 |
| --- | --- | --- |
{{< /tbl >}}

{{< eg num="2-2" caption="用 pg_basebackup 拉起一个新从库。" >}}
```bash
pg_basebackup -h primary -U replicator -D /pg/data -Fp -Xs -P -R
```
{{< /eg >}}
```

> [!IMPORTANT]
> shortcode 正文里不能写脚注（`[^label]`）——Hugo 把 shortcode 正文当独立 Goldmark 文档渲染。需要脚注的表格或代码块改用原生形态。

## 交叉引用

普通同页 Markdown 链接可行但标签与编号要手写。`xref` 把标签、编号、锚点合成一处，并支持跨页跨语言：

```markdown
参见 {{< xref fig="2-2" />}} 与 {{< xref eg="2-1" />}}；
显式锚点：{{< xref fig="2-1" anchor="book-release-note" />}}。
无类型：{{< xref page="../ch01/install" anchor="sync-replication" >}}同步复制{{< /xref >}}
```

最多一个类型键（`fig`/`tbl`/`eq`/`eg`）；`anchor=` 覆盖推导锚点；`page=` 跨页（走当前语言查找）；无类型时必须同时给 `anchor=` 和内部链接文字；前向引用合法。

## 索引与整本打印

五个 shortcode 遍历同一棵书树，通常放书首页：

```markdown
{{< book-toc depth=3 >}}

## 插图目录 {#lof}
{{< book-figures >}}

## 表格目录 {#lot}
{{< book-tables >}}

## 公式索引 {#loe}
{{< book-equations >}}

## 示例索引 {#lox}
{{< book-examples >}}
```

`book-toc` 的 `depth` 取 1–3（默认 2），`drafts=false` 滤掉 `book_status: draft` 行；四个清单 shortcode 不接受参数。书根有 `print` 输出后按阅读顺序合成封面、本地目录、根正文与每个后代章节到一个 HTML 文档；`no_print: true`、纯链接节点、分隔行、隐藏占位不会成为章节。

## Book shortcode 参数

| 参数 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `num` | 字符串 | — | 必填（`eq` 无参形态除外），匹配 `[0-9A-Za-z.-]+`，要引号 |
| `id` | 字符串 | `<kind>-<num>` | 匹配 `[A-Za-z][A-Za-z0-9_.:-]*`，逐字节保留 |
| `caption` | 纯文本 | 空 | `eg` 必填；`fig`/`tbl`/`eq` 可选 |
| `class` | class token | — | 追加 `<figure>`，需要 `num` |
| `src` / `link` / `alt` / `width` / `height` / `title` | — | — | 仅 `fig`；宽高正整数；`title` 是 `caption` 迁移别名 |

## 迁移既有书稿

主题仓库带迁移脚本，把站点自有 `figure` shortcode、加粗假题注、`#fig_*` 裸链接改写成 `fig`/`tbl`/`xref`。配方 `--profile`: `tpme`/`ddia-v2`/`ddia-v1`/`pg-internal`；`--write` 才落盘（默认干跑），`--report` 输出 JSON。应用后跑第二遍确认 `idempotent: true`。

## 限制

- 没有自动编号，章节号/图号/表号都手写。
- 属性行必须紧贴块，被 Prettier 之类工具移动后会静默失效。
- `book_kind` / `book_part` 是契约认可键但当前模板不渲染；视觉效果来自 `book_number` 与 `book_status`。
- 索引 shortcode 会触发后代内容渲染，超大树上明显拉长构建时间。

---

# 发布与下载页

发布事实集中两处：页面 front matter 的 `release_url`（指向哪个 GitHub 发布），`data/download/<key>.yaml`（安装方式）。构建期不访问 GitHub。

| 你要的 | 用什么 | 事实来自 |
| --- | --- | --- |
| 版本摘要卡片 | `release-card` shortcode | 页面的 `release_url` |
| 校验和资产表 | `checksums` 围栏 / `release-assets` | 正文里的 `sha*sum` 行 |
| 多渠道下载区块 | `download` shortcode | `data/download/<key>.yaml` |
| 按时间排序的发布索引页 | `layout: releases` | 各页 `release_url` |

```yaml {title="content/blog/release/0.4.0.zh.md"}
release_url: https://github.com/pgsty/oink/releases/tag/v0.4.0
```

必须是精确标签形式的 GitHub 发布 URL，否则警告并跳过发布区块。`{{< release-card >}}` 不带参数，本地推导发布页、两种源码归档、仓库四个链接。

栏目改 `layout: releases` 后按页面日期倒序，同一天以标签的 SemVer 决胜；`release_url` 可解析的条目读作「项目名 + 标签」，否则保留标题。

`checksums` 围栏接受两种行：`<hex><两个空格><文件名>` 与 `<hex><空格>*<文件名>`；空行与 `#` 开头忽略；哈希长度决定算法（MD5/SHA-1/SHA-256/SHA-512），一个块只能一种算法。有 `release_url` 时基址推导为 `https://github.com/<repo>/releases/download/<tag>/`，否则必须显式 `base=`。

```markdown
```checksums {base="https://repo.example.org/oink/v0.4.0/" algo="sha256"}
1e2f4c8a9d05b7361f8ac25d0e7b4913a6c8df215047eb9c3a1d6b8250f9e7c4  oink-0.4.0-linux-amd64.tar.gz
```
```

`data/download/<key>.yaml` 记录级字段只有 `version` `repo` `tag` `published` `channels`；渠道字段 `id`（`^[a-z][a-z0-9-]*$`，记录内唯一）、`kind`（`rolling`/`pinned`）、`title`/`note`（本地化，`<字段>_<语言>` 解析）、`icon`、`url`、`steps[]`（`title`/`code`/`lang`）、`checksums`/`checksums_src`。只有 `pinned` 渠道的 `url` 与 `steps[].code` 能插值 `${version}`/`${tag}`。渲染：`{{< download "prd5" >}}`。标签/资产未就绪时标 `published: false`，固定版本渠道变「待发布」，滚动渠道照常。

一次发布顺序：更新 `data/download` 的 `version` → 新写 `content/blog/release/<version>.md` 并填 `release_url` → 标签与资产就绪后把 `published` 翻成 `true`。

---

# API 文档（OpenAPI）

一页接口文档 = 一份 OpenAPI 规范 + 一个 shortcode。Swagger UI（5.32.13）与 Redoc（2.5.3）随主题分发，只在用到它们的页面、只在该页 HTML 输出里加载，不连 CDN。三步：规范放 `static/`，新建页面写 shortcode，需要专用外壳时把 `type` 设 `swagger`。

规范文件必须放 `static/`（原样发布到站点根），两个 shortcode 都把本地值视为 `static/` 下路径；放页面旁边不会发布，浏览器 404。

```markdown
{{< swagger src="/openapi/docs-demo.yaml" >}}

{{< redoc "openapi/docs-demo.yaml" >}}
```

`swagger` 只有具名参数 `src`（站点根起 URL，经主题 URL 校验，子路径部署正确）。`redoc` 只接受一个位置参数（多写告警且不渲染），本地值转成基于 `baseURL` 的绝对 URL。http(s) 远程规范两者都接受，但属网络依赖，内网/有 CSP 的站点应用同源规范。

```yaml {title="content/api/_index.md"}
---
title: 集群管理 API
type: swagger
page_width: wide
cascade:
  type: swagger
---
```

`swagger` 外壳（`shell_types` 默认包含）与 `docs` 只有两处差别：`<body>` 多 `td-swagger` class、不显示版本横幅；侧栏/目录/面包屑/翻页器/页尾照常。
