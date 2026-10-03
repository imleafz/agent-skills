# OINK 站点功能参考

来源：https://oink.pgsty.com/zh/docs/customize/（OINK v1.1.0 文档）

覆盖：本地全文检索、命令面板、键盘导航、多语言、多版本、分类体系、仓库与页面信息、打印、Agent 支持。键名/命令/URL 保持原文。

---

## 全文检索

本地搜索：Hugo 构建时每语言生成一份 JSON 索引，浏览器下载后本地检索，无爬虫/账号/CDN/联网。默认关闭。

**开关与装配**：`params.offline_search: true` 同时决定索引、Lunr 运行时、搜索对话框是否进页面。三条件全成立才装配，否则资源**不生成**（非隐藏）：① 开关为真；② 页面是首页，或用外壳布局（`docs`/`book`/`blog`/`swagger`），或落地页开了 `params.ui.landing_search`；③ 当前输出不是打印。`hugo server` 下索引默认也生成；超大站点可加 `offline_search_on_serve: false` 预览时跳过。入口是命令面板。

**索引体积** `offline_search_index`：

| 取值 | 索引内容 | 适用 |
| --- | --- | --- |
| `title` | 标题、标签、分类、`search_keywords` | 只靠标题定位的超大站 |
| `heading` | 上面 + 页内各级标题 | 标题足够具体 |
| `summary` | 上面 + 描述与摘要 | 千页级站点（本站使用） |
| `content` | 上面 + 全文纯文本 | **默认值**，几百页以内 |

其它取值：普通预览告警并用 `content`；严格发布构建因 `invalid params.offline_search_index` 失败。配套键：`offline_search_summary_length`（默认 70，结果行摘要截断长度）、`offline_search_max_results`（默认 10，结果条数上限）。**索引预算**每语言一份，未压缩 2 MiB、gzip 512 KiB，超了就从上表降到 `summary`。

**排序（front matter）**：如 `title: PostgreSQL 参数`、`search_keywords: [postgres, postgresql, pg, 数据库参数, GUC]`、`search_boost: 1.5`。

- `search_keywords`：额外匹配词（字符串或数组），权重仅次于标题、高于正文；搜 `pg`/`GUC` 可命中标题只写「PostgreSQL 参数」的页。
- `search_boost`：最终得分正数乘子，默认 `1.0`；零/负数/非数字告警并按 `1.0`。
- 整节默认用 cascade 设 `search_boost`/`search_keywords`，页面自身值覆盖继承值。

**排除**：front matter `search_exclude: true` 是唯一写法；已移除的 `exclude_search`/`excludeSearch` 不再读取（迁移检查器报告）。正文为空的页面不进索引。索引是任何人可下载的静态 JSON，**不是访问控制**。

**中文与 CJK**：查询检测到 CJK 时整条切到**子串匹配**（逐篇比对标题、关键词、页内标题、描述、正文，命中哪层给哪层分，最后同样乘 `search_boost`），排序规则与英文路径一致。① 「主从复制」只命中连续四字，「复制主从」无结果；② `search_keywords` 对中文站收益最大；③ 输入法组字期间不重算，上屏后才检索。首查须下载整份索引。

**可选在线搜索**：默认关，**同时只能启用一种**，多个并存告警 `You have more than one site-search option configured`。Algolia DocSearch（`params.search.algolia` 的 `appId`/`apiKey`/`indexName` 三值必须全显式写出，缺一构建中断，不回退公共索引）；Google CSE（`params.gcs_engine_id`，另需 `content/search.md` 写 `layout: search`，提交到 `<baseURL>/search/?q=…`）。

**验证**：`hugo --printPathWarnings --panicOnWarning && ls public/offline-search-index.*`（每语言一份，开发为 `.zh.json`、生产带指纹）。子路径部署时用开发者工具确认索引请求带子路径（打到域名根 404 是「搜索没结果」最常见原因）。

---

## 命令面板

站点唯一模态入口：搜页、复制本页 Markdown、切语言/版本、跳自定义链接都在一个对话框。随本地搜索装配（`offline_search` 关则面板不进入页面）。

| 打开方式 | 打开成什么 |
| --- | --- |
| 点顶栏/侧栏搜索框、<kbd>/</kbd>、<kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>K</kbd> | 完整搜索态（⌘/Ctrl+K 再按关闭） |
| 反斜杠键、框内输入 `>` 开头 | 纯命令态（等于预填 `>`） |
| <kbd>f</kbd> / <kbd>c</kbd> | 上面两者别名，由键盘导航提供 |

`/`、反斜杠、`f`、`c` 是裸单键，给输入让行；带修饰键的 ⌘/Ctrl+K 无此限制。面板内 ↑↓ 选择、Enter 执行、Esc 关闭并交还焦点。

**空输入时按固定顺序列四组**：

| 分组 | 内容 | 谁决定 |
| --- | --- | --- |
| 快速链接 | 顶栏一级菜单选出的入口 | `params.ui.quick_links` |
| 页面操作 | 复制/查看 Markdown、编辑本页、修改历史、新建子页、提 issue、打印整节 | 仓库配置与本页是否有 Markdown 输出 |
| 偏好设置 | 切换版本 → 语言 → 主题 | 是否配了多版本/多语言/深浅色菜单 |
| 命令 | 打开 GitHub 仓库，之后是自定义命令 | `github_project_repo`（缺省回退 `github_repo`）与 `ui.command_palette.commands` |

输入文字时先列页面结果，按内容根分组（组名是面包屑第一段，组序跟随顶栏一级菜单），命令与动作合并一组排最后；`>` 只列命令与动作。不可用项在能说明原因时仍列出。

**快速链接**从 Hugo 主菜单按 identifier 选取，不另写清单：`params.ui.quick_links: [docs, blog]`（值是 `menus.main` 条目的 identifier；缺省取 docs/blog 栏目）。

**自定义命令**写在 `params.ui.command_palette.commands`，排内建命令之后，顺序即书写顺序：

```yaml {title="hugo.yml"}
languages:
  zh:
    params:
      ui:
        command_palette:
          commands:
            - id: theme_issues
              title: OINK 问题反馈
              description: 报告或查看主题与文档问题
              url: https://github.com/pgsty/oink/issues
              icon: fa-brands fa-github
              keywords: [缺陷, 支持, 路线图]
```

- `id` 必填，小写字母开头，仅小写字母/数字/下划线/短横线；不能与内建动作 ID 重名。
- `title` 显示名；`description` 下方小字；`icon` 一对 Font Awesome class；`keywords` 参与匹配不显示。
- `url` 与 `action` **有且只能有一个**。`url` 只接受 `http`/`https` 完整地址、站内路径、`#` 页内锚点（带主机名的新标签打开）；`action` 引用内建动作 ID。
- 无效记录：普通预览告警并丢弃，严格发布构建拒绝该警告。不要用 `action:` 给内建动作起别名。

多语言写在 `languages.<lang>.params...` 下；顺序由默认语言清单决定，其它语言同 `id` 只覆盖字段、新 `id` 追加末尾。配置不能注入 JS 回调（纯数据清单）。

**页面动作**：面板「页面操作」与标题旁拆分按钮同一实现（左半复制本页 Markdown，右箭头展开全部）。`params.ui.page_context_menu` 下 `enable`（false 只移除标题旁按钮，面板项保留；单页用 front matter `page_context_menu: false` 覆盖）、`assistant_links`（默认 false，见 Agent 支持）、`links`（额外外部动作，只出现在标题旁菜单，占位符 `{url}`/`{title}`/`{markdown_url}` 替换为当前页值）。

**与全文检索的关系**：两条独立数据源。页面结果来自本地索引（索引未生成/下载失败时面板照常打开、照常执行命令，页面部分显示「页面索引暂不可用，操作仍可使用」）；命令与动作来自页面内嵌 JSON 清单，不需网络。打印态不装配面板；关闭 `offline_search` 后也无面板，f/c 静默。

**查询尾部扩展（1.1 起）**：站点 JS 用 `window.OinkCommandPalette.registerSearchTail({ id, rows(ctx), activate(row, ctx) })`（v1.0.0 与未启用本地搜索的页面不提供）。扩展行排原生结果与操作之后（含空结果与索引错误态）；空查询/命令/选择/加载态不出现。`rows()` 保持纯净同步、字符串按文本渲染；激活接收生成该行时的查询。打开另一受协调器管理的界面前调用 `context.handoff()`，此后站点负责焦点与失败提示；无新界面的操作直接返回 Promise。

**验证**：`grep -o 'id="oink-action-manifest"' public/zh/docs/customize/panel/index.html`。空输入应见四组；输入 `>` 只剩命令与动作，新命令排「打开 GitHub 仓库」之后；切语言标题变、顺序不变；打印预览无面板痕迹。

---

## 键盘导航

WASD 在侧栏树移动，J K 在标题间跳转，Q E 翻页，另几键切主题/语言/面板。默认开启，所有绑定给输入让行，可按站点或页面关闭。不维护第二套状态，顺序与鼠标一致。

| 按键 | 行为 |
| --- | --- |
| W S ↑ ↓ | 侧栏：焦点移到上一个 / 下一个可见项 |
| A D ← → | 侧栏：折叠 / 展开分组；叶子节点上 A 跳父级，D 无动作 |
| Enter Space G | 侧栏：激活焦点项（打开页面，或展开/折叠分组按钮） |
| Esc | 侧栏：退出树，焦点回正文 |
| J K | 阅读：沿页面目录跳到下一节 / 上一节 |
| N | 阅读：首页专用，跳到下一个顶层分区（首页 J 别名） |
| Q E | 阅读：上一篇 / 下一篇 |
| H | 阅读：专注模式，隐藏 / 恢复导航外壳 |
| L Y | 外观：循环切换语言（两键等价） |
| T | 外观：亮 / 暗模式切换 |
| R | 外观：在首页与顶栏的同源一级入口之间循环 |
| F 或 \/ | 搜索：打开命令面板完整搜索态 |
| C 或反斜杠键 | 搜索：打开命令面板纯命令态 |
| ⌘ + K / Ctrl + K | 搜索：打开面板；再按关闭 |

- 侧栏四字母键不需先进入树：焦点在正文时按 S，以当前页在侧栏的项为起点下移一格并落焦。窄屏侧栏收进抽屉/桌面折叠时第一次按先展开侧栏；无侧栏树时静默。方向键仅在焦点已进入侧栏后作用于树，RTL 下 ← → 对调，A D 恒为折叠/展开。1.1 起不发布自身页面的分组通过展开按钮参与导航，Q/E 跳过分组按钮。
- J/K 目标序列与右栏目录同源；固定 100 ms 缓动滑行，与距离无关，连按不等动画结束；读到某节内部一段距离后 K 先回本节起点再按才跳上一节。Q/E 按**侧栏树可视顺序**（非日期）翻页，栏目入口页本身是树里一项，折叠分支不在顺序里；无侧栏树回退页尾翻页器，无翻页器用 `<head>` 的 `rel=prev/next`。H 状态记在当前标签页会话，首帧前恢复。
- L/Y、T、R 在任何交互式页面有效；单语言站的 L、关闭深浅色菜单后的 T、只有一个一级入口时的 R 都静默。R 只在同源一级菜单项间循环。`/`、反斜杠属于搜索本身，关闭键盘导航后仍可用；F/C 是键盘导航提供的别名。
- 保留键：`?`（速查卡挂页脚最底层问号按钮）、`G G`、`Shift + G`、数字键。

**让行规则**：裸单键，以下场合一律禁用——焦点在 input/textarea/select/`contenteditable`；输入法组字（中文站硬约束）；按住修饰键（⌘ + C 仍复制，Shift + ↓ 仍归浏览器）；命令面板或别的对话框开着时键盘归弹层。评论区在 iframe 中，键事件不冒泡。

**无障碍**：进页面后第一次 Tab 是「跳转到主要内容」；树内导航移动真实 DOM 焦点；高对比度模式下焦点底色失效退化为系统高亮描边；`prefers-reduced-motion` 打开时逐节跳转与翻页改为瞬时定位；1.1 起隐藏的侧栏/抽屉内容退出键盘焦点范围。

**关闭**：`params.ui.keyboard_nav: false`（全站），或 front matter `keyboard_nav: false`（单页/整节 cascade）。该键只接受布尔值；写成 `"false"` 时普通预览告警并用站点默认值，严格发布构建因 `params.ui.keyboard_nav must be a boolean` 失败。关闭后运行时不进入 JS bundle；`/`、反斜杠、⌘ + K 仍可用。

**验证**：`grep -c 'td-shell-keyboard__trigger' public/zh/docs/customize/keyboard/index.html`；连按 S 应从当前页逐项下移，点进搜索框按 J 页面不应滚动。

---

## 多语言

Hugo 多语言模型，不引入额外目录约定：配 `languages` 块，译文与原文并排同目录、用文件名后缀区分。

```yaml {title="hugo.yml"}
defaultContentLanguage: en
languages:
  en:
    label: English
    locale: en-US
    weight: 1
    title: OINK
    params: { description: A Hugo theme for engineering docs }
  zh:
    label: 简体中文
    locale: zh-CN
    weight: 2
    title: OINK
    params:
      description: 为工程而设计的 Hugo 文档主题
      time_format_default: 2006年1月2日
      time_format_blog: 2006年1月2日
```

- `label`：选择器显示名，用该语言自己的文字（`简体中文` 而非 `Chinese`）。
- `locale`：标准语言标签，进 `<html lang>`、`hreflang`、Open Graph。
- `weight`：语言排序与选择器轮换顺序，小者在前。
- `params`：语言级覆盖，未写的键继承全局同名值（日期格式通常按语言各写一遍）。

默认语言不带前缀（英文 `/docs/…`），其它语言各占前缀（中文 `/zh/docs/…`）。默认语言也要前缀时加 `defaultContentLanguageInSubdir: true`（变全站 URL，已上线站要配重定向）。

**文件命名与资源**：译文与原文并排、后缀区分，靠相同基础文件名认成同一页的两个语言版本，如 `content/docs/install.md` + `install.zh.md`、`_index.md` + `_index.zh.md`。页面包同理（`index.md` + `index.zh.md` 同目录）。资源规则：不带语言后缀的由所有语言共享，带后缀的只属那种语言；正文引用带后缀资源时**写不带后缀的名字**（Hugo 按当前语言解析）。推论：页面包只有 `index.zh.md`、无英文对等页时，不带后缀的资源归属默认语言（该包内没有该页面），此时所有资源必须带 `.zh.` 后缀。

- **翻译**：`title`、`description`、摘要、菜单标签、标签名、图片 alt、提示块正文、shortcode 面向读者的参数。
- **保持一致**：日期、`weight`、别名及任何影响路由的元数据。
- **不翻译**：命令、配置键、文件名、URL、版本号、产品名、shortcode 名。

**按语言分开的配置**：

- **菜单**写在各自语言下，`identifier` 两种语言必须一致（命令面板快速链接与搜索分组顺序按它匹配），如 `languages.zh.menus.main: [{identifier: docs, name: 文档, pageRef: /docs, weight: 20}]`。
- **首页数据**按语言取文件：`data/home/en.yaml`、`data/home/zh.yaml`；当前语言无对应文件回退 `en.yaml`；单语言站一个 `data/home.yaml` 即可。
- **界面文案**：主题自带 32 份完整界面语言包（Docsy 31 个 locale 文件名 + 通用 `zh`），每份以目标语言覆盖全部 194 条消息，不依赖英文 fallback。`zh`/`zh-cn` 简体，`zh-tw` 繁体。改某条时在站点 `i18n/` 建同名文件只写要覆盖的键，例如 `i18n/zh.yaml` 里 `ui_search: 搜索文档`。兼容 Hugo 0.160.x 且地区化中文包同时存在时，为非默认通用 `zh` 保留 `locale: zh-CN`；Hugo 0.161 起可用裸 `locale: zh`。

**缺译回退与选择器**：选择器图标本身是链接，点击按 `weight` 顺序切下一种（末尾回第一种），悬停/键盘聚焦才展开全部语言菜单，触摸屏不展开、点按即切换。菜单始终列全部配置语言：有译文跳那一页，无译文跳该语言**首页**（避免 404）。缺译**不会用原文填充**——中文页面不存在时中文站就没有这一页，侧栏、搜索索引、翻页顺序都不包含它。搜索索引按语言分开，中文查询用 CJK 子串匹配。

**标题锚点对齐**：中文标题生成中文 ID（`#prerequisites` 与 `#前置条件` 互不相通）。在译文标题显式写出原文 ID：`## 前置条件 {#prerequisites}`。两条纪律：① ID 从**英文页渲染出的 HTML** 取，不凭标题文本推断（含行内代码/徽章/shortcode 时生成的 ID 与文本不一致）；② 中英对应页面的标题数量、顺序、ID 必须一致；中文里要加一节时给它独立稳定的 ID。CI 比对渲染后 HTML：`node scripts/check-doc-translations.mjs --public public`。

**RTL**：语言下声明 `direction: rtl`，`<html dir>` 随之改变，主题额外加载 Bootstrap RTL 样式表。主题 CSS 全用逻辑属性（`margin-inline-start`），镜像布局自动完成；站点自己的 CSS 也要用逻辑属性。

**验证**：`ls public/index.html public/zh/index.html public/offline-search-index.*`；`<head>` 里每语言一条 `rel="alternate"` 外加一条 `rel="canonical"`；有译文页选择另一语言应停在同一篇，无译文页应落到目标语言首页。

---

## 多版本

主题提供顶栏版本切换菜单与旧版本归档横幅。部署布局由站点决定：主题不做跨版本单次构建，**每个版本是一次独立 Hugo 构建**。

```yaml {title="hugo.yml"}
params:
  version: v2.1          # 当前站点是哪个版本
  version_menu: v2.1     # 菜单无障碍名称
  versions:
    - { version: v2.1, url: https://docs.example.com }
    - { version: v2.0, url: https://v2-0.docs.example.com }
    - { version: v1.9, url: https://v1-9.docs.example.com }
```

- `params.versions` 非空时顶栏工具区出现分支图标菜单，页脚最底层栏出现同样内容的纯图标菜单。
- 菜单项默认显示 `version`，写了 `name` 显示 `name`。当前项选中判定：条目 `version` 等于 `params.version`，**或**条目 `url` 等于站点 `baseURL`，其一即可。
- 无 `url` 的条目为不可点击灰项（可分节标题）；`name: '---'` 是分隔线（分隔线上写 `url` 会告警）。`name` 支持行内 Markdown。
- 同一份列表也是命令面板「切换版本」的数据来源。

**逐页跳转**：`version_menu_pagelinks: true` 把当前页路径拼到目标版本 URL 后，切换时停在同一篇；代价是目标版本可能没有该页（结构演进）→ 404。单条目可覆盖 `pagelinks: false`。判断依据是文档结构稳定程度而非版本号距离：稳定时开，变动大时关。

**归档横幅**：`archived_version: true` + `version` + `url_latest_version` 时，每个文档页与书籍页正文顶部出现横幅，写明当前版本不再维护并链向最新版；文案随语言本地化，`version` 是横幅显示的版本号。横幅只出现在文档与书籍页。

**`params.version` vs `params.versions`**：前者是当前构建的版本标识，决定菜单哪项被选中、归档横幅版本号、`data/download/*.yaml` 没写 `version` 时的兜底（不一定是 Git 引用；需要能解析的发布 tag 时另设参数）；后者是**跨站点清单**，描述菜单能跳到哪些版本、各自地址。

**部署布局**：

| 布局 | `baseURL` | 特点 |
| --- | --- | --- |
| 子域名 | `https://v1-9.docs.example.com/` | 各版本独立互不影响；每版需配 DNS 与证书 |
| 子路径 | `https://docs.example.com/v1.9/` | 单域名，SEO 权重集中；托管方需支持按路径路由到不同产物 |

每版从对应 Git 分支/tag 检出、用那一版自己的 `hugo.yml` 构建；当前版本站把 `versions` 列全，旧版本站再加归档横幅。**子路径部署时 `baseURL` 必须包含那段路径**，否则搜索索引、页面动作与资源链接都指向域名根。

**验证**：`grep -c 'nav-version-menu' public/zh/docs/customize/versions/index.html`（`versions` 为空时不生成）。`grep -o 'nav-hover-menu__option is-active[^>]*' public/index.html` 一条都没有说明 `params.version` 与条目 `version` 对不上，或 `baseURL` 与 `url` 不一致（注意结尾斜杠）。

---

## 分类体系

目录树只有一条路径，taxonomy 给页面加第二条。启用只需 Hugo 的 `taxonomies:`（顶层配置，键是单数名、值是复数名，如 `taxonomies: { tag: tags, category: categories, module: modules }`），术语页、术语卡片、右栏分类云、顶栏分类面板都自动生成。

- 写了 `taxonomies:` 后它就是**完整列表**，不是追加；想保留 `tags`/`categories` 必须一起列出。
- 复数名同时是 URL 段：`/zh/tags/`、`/zh/categories/`。全部关闭：`disableKinds: [taxonomy, term]`。
- 显示名：`tag`/`tags`/`category`/`categories`/`module`/`modules` 六键有内置本地化标题；其它用复数名 humanize（`products` → `Products`）。自定义名字在 `content/<复数名>/_index.md` 与 `_index.zh.md` 的 `title`/`linkTitle` 里写，主题优先用它。

**打标签**：front matter 键名用**复数名**，值始终是列表：

```yaml {title="content/docs/ha/patroni.zh.md"}
---
title: Patroni 高可用
categories: [高可用]
tags: [PostgreSQL, Patroni, 故障切换]
---
```

整栏目共用分类写在栏目首页 `cascade`；页面自己写 `categories:` 覆盖 cascade，不合并。

**术语行**：文档/博客页在标题、摘要下渲染一行已分配术语，容器 `.taxonomy-terms-article`，按分类法另带 `.taxo-<复数名>`。默认列出**全部**分类法，只有 `authors`/`series` 两个保留复数除外。用 `params.taxonomy.page_header: [categories]` 指定显示与顺序；它不能用来隐藏这一行（`[]` 被当作未设置）。

**术语页与列表页**：分类法列表页 `/zh/categories/`（每术语一张卡片，用量多者在前）；术语页 `/zh/categories/定制站点/`（标题与页面数，按日期倒序列出该术语全部页面）。中文术语 URL 用中文字符（不做拼音转写）；需要 ASCII URL 时改用英文术语，再在 `content/categories/<术语>/_index.zh.md` 用 `title` 给中文显示名。术语页成员全在同一顶层栏目下时用该栏目渲染侧栏树，跨栏目回退站点级树。

**右栏分类云**：文档/博客/术语页每种分类法一组芯片，带计数、可折叠、无开关。列表页与术语页右栏最上是切换器（当前行高亮，只有一种分类法时不显示）。计数**不是全站计数**，而是按顶层栏目统计（先看 `type` 有无同名栏目，否则用页面所在顶层栏目）。

**顶栏分类面板**：主菜单指向分类法列表页的条目自动变成术语芯片面板。`pageRef: /tags` 与旧式 `url: /zh/tags/` 都能识别。

**图标**按复数名配置：`params.ui.taxonomy_icons`。默认 `categories: fa-solid fa-folder`、`tags: fa-solid fa-tags`，其它 `fa-solid fa-shapes`。

**authors 与 series**：普通 Hugo taxonomy，主题只加各自呈现，「声明」即全部开关。

| 复数名 | 声明后打开了什么 | term 页变成什么 |
| --- | --- | --- |
| `authors` | 文章头部头像与链接名、列表行名字、feed 里每位作者一条 `<dc:creator>` | 作者主页：显示名取 linkTitle 回退 title，`description` 一句话介绍，正文长介绍，头像取题图解析器选中那张 |
| `series` | 正文上方横幅（系列名、本篇位置、下一篇，及折在 `<details>` 里的列表） | 系列引言，成员按阅读顺序排（非最新在前） |

主题不设 `data/authors`（作者主页就是 term 页本身）。系列 term 页是唯一不按时间倒序的 term 页：`series_weight` 升序在前，其余按日期升序在后。

**双语标签**：分类按语言分开（`/categories/` 与 `/zh/categories/` 互不相干），术语在各自语言 front matter 里各写一遍。① 同一词在两语言写成同字符串仍是两个术语页；不要为了统一在中文页写英文词（芯片会显示英文）。② 分类法显示名跟语言走，但**术语名不会**。

**按内容类型与限制**：主题没有「文档显示、博客不显示」开关，控制点是给哪些页面打标签。让整栏目消失：删栏目首页 cascade 里的 `categories`；让某页不进分类：`categories: []`（覆盖 cascade）。`page_header: []` 不会隐藏术语行（要隐藏就在 `assets/scss/_styles_project.scss` 隐藏 `.taxonomy-terms-article` 或不打标签）。右栏分类云无开关、无条数上限。术语页没有跨语言对等关系。

**验证**：`ls public/zh/categories/` 每术语一目录；`grep -c 'taxonomy-term' public/zh/docs/customize/index.html`；`python3 bin/check-taxonomy.py`。

---

## 仓库与页面信息

操作菜单里与仓库有关的条目由几个 `github_*` 参数推导；页尾「最后修改」来自 git 历史。前提是内容存放在 GitHub 风格仓库。

```yaml {title="hugo.yml"}
params:
  github_repo: https://github.com/pgsty/oink.pgsty.com # 文档源码仓库
  github_project_repo: https://github.com/pgsty/oink   # 产品仓库（可选）
  github_branch: main                                   # 默认 main
  github_subdir: ''                                     # 仓库根到 Hugo 站点根的路径
```
| 菜单条目 | 目标 |
| --- | --- |
| 编辑当前页面 | `…/edit/main/content/docs/customize/repository.zh.md` |
| 查阅编辑历史 | `…/commits/main/content/docs/customize/repository.zh.md` |
| 添加子页面 | `…/new/main/content/docs/customize?filename=change-me.md&value=<模板>` |
| 提交文档议题 | `…/issues/new?title=仓库与页面信息` |
| 提交项目议题 | `https://github.com/pgsty/oink/issues/new` |

- `github_repo` 指内容所在仓库（不是主题仓库）；省略它时上表五条全部消失。
- `github_project_repo` 是第二个仓库，接收产品缺陷而非文档错误；读者难以区分时不要配置。
- `github_branch` 默认 `main`，填内容分支（不是部署分支/Pages 自动生成分支）。
- `github_subdir` 是仓库内路径；站点源码在仓库根目录时留空，放在子目录时填子目录名。这几个键可在站点、单语言、栏目 cascade 或页面 front matter 上设置。

**内容来自另一个仓库**：栏目 cascade 覆盖仓库参数，用 `path_base_for_github_subdir` 去掉本地路径前缀、剩余接到 `github_subdir` 后：

```yaml {title="content/reference/_index.zh.md"}
---
title: 上游参考
cascade:
  github_repo: https://github.com/OWNER/UPSTREAM
  github_project_repo: https://github.com/OWNER/UPSTREAM
  github_subdir: docs
  path_base_for_github_subdir: content/reference
---
```

`path_base_for_github_subdir` 值是正则；源文件名与本地不同名时改用 `from`/`to` 映射（如 `from: content/reference/(.*?)/_index.md`、`to: $1/README.md`）。`.md` 与 `.zh.md` 并排同目录、共用路径前缀，正则里不需要语言目录。改完从叶子页、栏目首页、两种语言各点一次「编辑当前页面」验证。

**操作 ID 与关闭条目**：

| 菜单条目 | 操作 ID |
| --- | --- |
| 复制 Markdown 文本 / 查阅 Markdown 源码 | `copy_markdown` / `view_markdown` |
| 在 ChatGPT / Claude 中打开 | `open_chatgpt` / `open_claude` |
| 查阅编辑历史 / 编辑当前页面 / 添加子页面 | `view_history` / `edit_page` / `create_child_page` |
| 提交文档议题 / 提交项目议题 / 打印完整章节 | `create_issue` / `create_project_issue` / `print_section` |

用 CSS 隐藏：`.td-page-actions__item[data-oink-action='create_child_page'] { display: none; }`。命令面板用同一批 ID，隐藏菜单项不会让它从面板消失。全站用不上的目标应从配置里省略对应键。「添加子页面」模板来自 `assets/stubs/new-page-template.md`，站点同名路径放一份即可替换。

**最后修改时间**：数据来自 git，不是文件 mtime：

```yaml {title="hugo.yml"}
enableGitInfo: true
params:
  github_repo: https://github.com/pgsty/oink.pgsty.com
  ui:
    lastmod_commit: subject # subject | hash | none
```

页尾出现「最后修改 2026年8月17日 · <commit 主题> (a1b2c3d)」，commit 链到 `…/commit/<hash>`。取值：`subject`（默认，commit 主题 + 缩写 hash）、`hash`（`commit a1b2c3d`）、`none`（只有日期）。写别的值时普通预览告警并用 `subject`，严格发布构建因 `invalid params.ui.lastmod_commit` 失败。

- CI 必须有足够 git 历史：浅克隆（`fetch-depth: 1`）取不到最后提交，GitHub Actions 里设 `fetch-depth: 0`。
- 未提交的文件没有 git 时间，本地预览新页面时这一行不出现。不要用构建时间代替「最后修改」。

这一行属于 **Annotation** 组件，默认开启，位于反馈之后、翻页器之前；整页关闭写 `annotation: false`。同区块还渲染（由 front matter 驱动）：**上游署名**（`upstream_link` + 必填 `upstream_name`/`upstream_copyright`/`upstream_license`/`upstream_notice`；`upstream_modified: true` 追加「本地已修改」）；**译文说明**（`params.ui.translation_notice` 写权威版本语言代码即显示指回原文的说明，原创页写 `translation_notice: false` 退出）。覆盖点：`layouts/_partials/annotation-items.html`（增删/重排行）、`page-meta-lastmod.html`（换渲染标记）、`page-annotation.html`（换外层容器）。

**页尾组成**（顺序固定，所有阅读型布局共用）：

| 顺序 | 组件 | 主题默认 | 页面开关 |
| --- | --- | --- | --- |
| 1 | 分享 Share | 关（`params.ui.share` 为空） | `share: false`，或页面自己的列表 |
| 2 | 反馈 Feedback | 关 | `feedback: true` / `false` |
| 3 | 页面信息 Annotation | 开 | `annotation: false` |
| 4 | 翻页器 Pager | docs / book / blog 开 | `pager: false` |
| 5 | 评论 Comments | 配置完整时开 | `comments: false` |

**反馈组件**：「这篇文档解决了你的问题吗？→ 是/否」，选「否」展开四个原因。默认关闭：`params.ui.feedback.enable: true`，`reasons`（默认，选否后是否追问）。单栏目开用栏目首页 `cascade: { feedback: true }`。行为：点击即完成（无输入/无提交/无登录）；选择按「页面 + 语言」写 `localStorage`；站点有 GA（`gtag`）时发 `docs_feedback` 事件（`result`=`solved`/`not_solved`、`page_path`、`language`，选原因时多带 `reason`、`refinement: true`），**没有 analytics 时照常工作**只是不上报；本页启用评论时多一条「在评论区补充详情」锚点链接。

**贡献者墙**：`contributors` shortcode 渲染 GitHub 头像墙，数据来自站点 `data/`，**不在构建期访问 GitHub**：

```yaml {title="data/contributors.yaml"}
items:
  - { github: Vonng, name: Ruohang Feng, role: 主题作者 }
  - { github: gohugoio, role: 静态站点生成器, avatar: /icons/logo.svg }
```

`github` 必填校验合法用户名，重复告警并跳过后项（严格构建拒绝）；`name` 缺省等于 `github`；`url` 缺省 `https://github.com/<github>`；`avatar` 不填渲染首字母占位块、不发网络请求，填写须为 `http(s)://` 或站内根相对路径。多套名单用 `data=` 指定。Markdown/RSS 输出降级成 `- [@handle](url) — role` 列表。

**验证**：`grep -o 'data-oink-action="edit_page" href="[^"]*"' public/zh/docs/customize/repository/index.html`；「编辑当前页面」应指向 `github.com/<仓库>/edit/<分支>/<源文件路径>`，路径与仓库逐段对应；栏目首页（`_index.md`）最易被 `path_base_for_github_subdir` 正则改错。

---

## 打印支持

单页打印无需配置：外壳（侧栏、目录、顶栏、按钮）都带 `d-print-none`，浏览器 `Cmd/Ctrl+P` 得到干净正文。需要配置的是把整个栏目/书连同全部子页面合成一份带目录的连续文档。

**启用整章打印**：`print` 是主题声明的自定义输出格式，主题不替站点打开，给 `section` 加上 `outputs: [HTML, RSS, print, markdown]`。`outputs` 每个键是**整体替换**而非合并，要把该类型原有格式（`HTML`/`RSS`/`markdown`）写全。开启后每个栏目多一个 URL，路径段 `_print` 在语言前缀之后、最前面：`/zh/docs/customize/` → `/zh/_print/docs/customize/`。页面操作菜单出现「打印完整章节」，命令面板也能搜到（操作 ID `print_section`）。它打印的是**当前栏目**：在 `/zh/docs/customize/print/` 点它得到整个「定制站点」栏目。

**结构**（从上到下）：① 提示条（带 `d-print-none`，只屏幕显示）；② 栏目标题与摘要；③ 全栏目目录（编号 `1:`、`2:`、`2.1:`，链到锚点）；④ 每页依次排列，标题变 `1 - 配置总览`，描述作导语。页面顺序是侧栏顺序（`weight`），子栏目递归展开。第二页起每页另起一页；第一页是否另起取决于栏目首页正文是否超过 50 个词。配置：`params.print.section_break_wordcount`（默认 50）、`params.print.toc: false`（不要目录，也可写在栏目首页 front matter `print: { toc: false }`）。

**排除页面**：front matter `no_print: true` 只影响整章打印视图，页面自己的 HTML 与 `Cmd/Ctrl+P` 不受影响。侧栏分隔项（`sidebar_divider`）也自动排除。

**组件在打印态**（规则：能交互的降级成静态，可折叠的一律展开）：

| 组件 | 打印形态 |
| --- | --- |
| 提示块 | 静态块，折叠型（`-`/`+`/`DETAILS`）全展开；边框转灰、去底色 |
| 标签页 | 标签条消失，所有面板依次展开，各带标题 |
| 代码块 | 去掉复制与展开按钮，取消最大高度与滚动，长行自动折行 |
| 表格 | 满宽静态表，取消横向滚动；表头跨页重复 |
| 图片 / 画廊 | 图与图注保留、剥掉缩放属性；网格改竖排堆叠 |
| 文件树 | 静态面板，目录全展开，分栏停在构建期宽度 |
| 参数表 / 公式 | 完整定义列表 / 静态 KaTeX 或 MathML |
| Mermaid · Markmap · PlantUML | 照常渲染成图（打印视图仍是 HTML 页，运行时照常加载） |
| ECharts · Infographic | 降级成围栏源码块，不渲染图表 |
| Asciinema · OpenAPI | 一行带标题的静态链接，三套运行时都不加载 |
| 卡片 / 步骤 / 徽章 / 按键 | 静态呈现，内容不变 |

页面外壳不进纸：侧栏、目录、顶栏、页面操作菜单、反馈组件、标题旁锚点链接、行内复制按钮。靠浏览器端运行时绘制的三种图（Mermaid、Markmap、PlantUML）触发打印前要确认已绘制完成。

**浏览器打印样式**：主题自带 `@media print` 规则，单页与整章共用——纸张 `A4`，页边距 `18mm 16mm 20mm`；正文 `10.5pt` 强制浅色；字体切 `--td-print-font-family` 排印令牌；标题 `break-after: avoid-page`，段落/列表项保留 3 行孤行/寡行控制；表格、图片、块引用、提示块、卡片、标签页尽量不跨页断开，代码块允许跨页但自动折行；链接加下划线、转深蓝，不打印 URL 文本（需要时在 `assets/scss/_styles_project.scss` 的 `@media print` 里自定义 `a[href^='http']::after`）；收起的 `<details>` 一律展开。

**替换打印模板**：覆盖 `layouts/_partials/print/` 下最窄的 partial——`print/render.html`（整章骨架：提示条、目录、递归内容）、`print/page-heading.html`（文档标题与导语）、`print/content.html`（单页在整章里的呈现）、`print/toc-li.html`（目录一行）。后三个支持**按内容类型**分化（如 `print/page-heading-blog.html`、`print/content-book.html` 优先）。整本书打印（`type: book`）走另一条路径，编号与交叉引用保持全书连续。

**验证**：`ls public/zh/_print/docs/` 每栏目一目录；在 `/zh/_print/docs/customize/` 按 `Cmd/Ctrl+P` 预览应看不到提示条/顶栏/按钮，含标签页与折叠提示块的页面应全部展开。

---

## Agent 支持

每页一个 `.md`、站点根目录一份 `llms.txt`、页面上一个「复制 Markdown 文本」按钮，都是构建期产物。此三件事都要站点自己在 `outputs` 里声明。另有两种为一次读多页的 agent 服务的可选产物：每栏目一份全文包、每语言一棵导航树。

**每页一份 `.md`**：`markdown` 是 Hugo 内置输出格式：

```yaml {title="hugo.yml"}
outputs:
  home: [HTML, markdown, LLMS]
  page: [HTML, markdown]
  section: [HTML, RSS, print, markdown]
```

`outputs` 每个键**整体替换**而非合并。URL 规律是页面 URL 后接 `index.md`（`/zh/docs/customize/agents/` → `/zh/docs/customize/agents/index.md`；栏目首页 → `/zh/docs/customize/index.md`；站点首页 → `/zh/index.md`）。`<head>` 里有发现链接 `<link rel="alternate" type="text/markdown" href="…/index.md">`。

内容不是 HTML 转回，而是**你写的源码**：front matter 换成 H1 标题 + 引用式摘要，其后正文原文，shortcode 就地展开（徽章→强调或链接，按键→`Ctrl + K`，标签页→`**标签名**` 小节，参数表→条目列表）。原生 Markdown 形态组件原样保留源码；栏目首页正文后附 `Section pages:` 子页链接清单。站点没开 `LLMS` 输出时不出现 `LLMS index:` 行。

**`llms.txt`**：给**首页**加 `LLMS` 输出格式即可生成，多语言各一份（`/llms.txt` 与 `/zh/llms.txt`）。三段来源：`Site index`（本语言首页 + `menus.main`，条目有 Markdown 版就链 Markdown 版，带 `description` 顺带写上）；`Documentation index`（`docs` 栏目子栏目及下一层，缩进示层级，每行附 `description`）；`Site locales`（全部配置语言）。指向站外的菜单条目被剔除。改进入手处是主菜单与各栏目首页的 `description`。

**全文包（LLMSFULL）**：每个顶层栏目一份 `llms-full.txt`，按阅读顺序装下该栏目每一页。开关在栏目首页 front matter：`outputs: [HTML, print, RSS, markdown, LLMSFULL]`（front matter 的 `outputs` 整体替换站点级列表，要把该栏目原有格式写回；按语言分开，双语站要在 `_index.zh.md` 同样写一遍）。产物 `/docs/llms-full.txt` 与 `/zh/docs/llms-full.txt`。顺序即侧栏与翻页器阅读顺序：`docs`/`book` 声明 `data/docs_nav.json` 显式树时以显式树为准，否则按内容树 `weight`；`toc_hide` 的页面不进包。每页前有带来源 URL 的分隔：

```text {title="/zh/docs/llms-full.txt（节选）"}
================
Source: https://oink.pgsty.com/zh/docs/customize/print/index.md
================

# 打印支持
…
```

`Source:` 指向该页 Markdown 输出，无 `.md` 时回退 HTML 地址。只有顶层栏目能带全文包，写在更深一层告警 `LLMSFULL output requires a top-level section` 且不产出。只要有栏目开了，`llms.txt` 多出 `## Full-text bundles` 段。

**导航 JSON（NAVJSON）**：每语言一份 `navigation.json`，由站点在首页打开（`outputs.home` 加 `NAVJSON`），产出 `/navigation.json` 与 `/zh/navigation.json`。这棵树就是侧栏与翻页器读的那一棵。

| 键 | 含义 |
| --- | --- |
| `id` | 去掉语言前缀的页面路径，同一页在各语言 `id` 相同 |
| `url` | 该语言下 HTML 页面绝对地址 |
| `markdown` | 该页 `.md` 绝对地址，只有确实产出 `.md` 时才有 |
| `title` | 导航标题（`linkTitle`，回退 `title`） |
| `description` | 页面的 `description`，有才写 |
| `kind` | 真实页面 `home`/`section`/`page`；占位条目 `external`/`link` |
| `children` | 有序子节点，有子节点才写 |

数组顺序就是契约，`weight` 不被序列化。`manual_link` 是 `external` 节点（URL 原样带出），`manual_link_relref` 是 `link` 节点（引用已解析），两者无页面身份、既无 `id` 也无 `markdown`。侧栏分隔线与从不渲染的页面被略去，其子节点留在原位。契约带版本 `schemaVersion: 1`，JSON Schema 为 `schema/nav.v1.schema.json`。

**页面上的 Agent 动作**：

| 条目 | 做什么 | 出现条件 |
| --- | --- | --- |
| 复制 Markdown 文本 | 抓取本页 `.md` 写进剪贴板（悬停预取） | 本页有 `markdown` 输出 |
| 查阅 Markdown 源码 | 新标签页打开 `.md` | 本页有 `markdown` 输出 |
| 在 ChatGPT 中打开 | 带一句提示词跳转到 ChatGPT | `assistant_links: true` |
| 在 Claude 中打开 | 同上，跳转到 Claude | `assistant_links: true` |

后两条默认关闭，需 `params.ui.page_context_menu.enable: true` + `assistant_links: true`。点击时运行时用浏览器地址栏完整 URL（含真实域名、查询串与锚点）拼提示词，中文站为「请阅读 <URL> 的内容，以便我就此向你提问。」，随后跳转。**离开本站的只有这个 URL，页面正文不会被上传**。页面可用 `page_context_menu: { assistant_links: false }` 收紧，不能反向打开；整菜单关闭用 `page_context_menu: false`。命令面板也能搜到这两条。

**按页面退出 `.md` 与自定义输出**：front matter 重写 `outputs`（整体替换，只写要保留的格式），如 `outputs: [HTML]`。主题用 `layouts/all.md` 渲染 Markdown、`layouts/index.llms.txt` 生成 `llms.txt`，可选输出由 `layouts/list.llmsfull.txt` 与 `layouts/index.navjson.json` 负责。优先用更窄做法：按内容类型（`layouts/blog/single.md`）、按 shortcode 加输出格式专属模板、或按页面手写。替换 `index.navjson.json` 意味着接手 `nav.v1` 契约，仍要能通过 `schema/nav.v1.schema.json` 校验。

**验证**：

```bash
hugo -d public
ls public/zh/llms.txt public/zh/docs/customize/agents/index.md
ls public/zh/docs/llms-full.txt public/zh/navigation.json   # 开了才有
```

四处检查：任一页 `<head>` 有 `rel="alternate" type="text/markdown"`；复制按钮粘贴得到 Markdown 而非 HTML；`llms.txt` 无站外链接；开了两种输出时 `llms-full.txt` 每页以 `Source:` 开头且同一页在各语言 `navigation.json` 里 `id` 相同。

**限制**：① 机器可读表面是四种构建期文件（每页 `.md`、`llms.txt`，及需显式打开的每顶层栏目一份 `llms-full.txt`、每语言一份 `navigation.json`），站点地图仍是 Hugo 的 `sitemap.xml`。② 全文包属于顶层栏目，没有整站一份：想读全站的 agent 按栏目逐个读，清单在 `llms.txt` 里。③ `LLMS`、`LLMSFULL`、`NAVJSON` 都声明为非替代格式，不出现在 `<head>` 的 `alternate` 链接里，也无对应页面操作；靠约定路径与 `llms.txt` 条目被发现。④ 服务端内容协商（同一 URL 按 `Accept: text/markdown` 返回 Markdown）不属于主题范围，要做在托管层。
