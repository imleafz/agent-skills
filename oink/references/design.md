# OINK 设计与开发（维护者契约）

来源：https://oink.pgsty.com/zh/docs/design/（OINK v1.2.0 文档，面向主题维护者）

本文件面向 OINK 主题维护者，记录现行不变量、已接受决策、研究证据与候选提案。面向读者的搭建指南不在这里。

## 职责边界与权威来源

OINK 仓库根是完整的 Hugo 模块与主题，**不是站点，也不是 npm workspace**。Hugo Extended 负责编译 SCSS 与模板；浏览器运行时与第三方资源已提交入库，普通构建不访问网络。

| 事实 | 权威位置 |
| --- | --- |
| 公开默认值 | 主题 `hugo.yaml`（注释即描述） |
| 可选配置结构/范围 | 对应解析器与检查器 |
| 渲染行为 | `layouts/`、`assets/` |
| 验收 | 检查脚本与 `tests/goldens/` |
| 内置依赖版本/许可证/校验和 | `VENDOR.json`、`bin/check-vendor.py` |
| 双语文档、示例、浏览器测试 | 同级 `oink.pgsty.com` 仓库 |
| 内部回归夹具 | 主题仓库 `tests/site/` |

- 生成的 `public/` 与 `resources/` 绝不是源文件；随主题内置的运行时、字体、Font Awesome 字形属于受支持的发行内容，不是待清理死代码。
- 唯一的中英文契约源文件位于本站仓库 `content/docs/design/`。
- 公共行为变化时，必须在**同一次交付**中更新实现、对应检查器、相关契约的中英文版本。测试验证行为与输出，不固定某段文字。
- 所有 OINK PRD/RFC 必须以中英文页面对放入 `content/docs/design/proposals/`；不得再建 `plan/`、`plans/`、`proposal/` 目录。

### 设计记录四层次

| 层次 | 含义 | 规范效力 |
| --- | --- | --- |
| 契约 | 兼容实现必须保留的行为 | 有 |
| 决策 | 解释现行行为的已接受理由与边界 | 有（辅证） |
| 研究 | 带日期证据，必要时重新验证 | 无 |
| 提案 | PRD 与 RFC 草案 | 无 |

## 仓库装配

- Hugo 类型 `docs`、`book`、`blog`、`swagger` 选择阅读外壳；`params.ui.shell_types` 可增补类型。落地页用 `layout: landing`。
- **没有 `article` 类型，也没有第二套博客外壳**；沉浸式页面只是博客展示的一种。
- `layouts/_partials/shell/config.html` 解析共享外壳事实。布局必须先经 `content/render.html` 渲染，再执行 `scripts.html`——渲染钩子与 shortcode 会在 Page Store 登记能力标志。
- 覆盖时应选**范围最窄**的 partial；即使几个基础模板相似，也不要合并（会改变 Hugo 查找优先级）。
- Font Awesome 官方编译 CSS 作为带指纹的 vendor 样式表发布，排在主题/站点 SCSS 编译的 `main.css` **之前**。KaTeX、DocSearch、Swagger、Asciinema 等能力样式独立，按需加载。
- 内容指纹使不可变 URL 成为可能；HTTP 缓存响应头属部署宿主，不属 Hugo 主题职责。

## 配置与诊断

主题策略位于 `params.ui.*`；多设置集成（`comments.giscus`、`plantuml`、`drawio` 等）留在顶层。布尔功能直接用布尔值，除非含多项设置。页面级覆盖去掉 `ui.` 前缀：`params.ui.image_zoom` ↔ `image_zoom`，**front matter 中绝不嵌套 `ui` map**。

### 诊断策略（已接受决策）

OINK **绝不调用 Hugo `errorf`**；`check-params.py` 强制守这条边界。无效输入统一：**警告（写明输入值、允许结构、实际回退）→ 使用回退或省略不安全功能**。

四条校验规则：

1. 点明无效键和值、允许的形状、实际采用的回退值。
2. 值来自页面 front matter 时带上页面位置；站点级错误不要每页重复刷屏。
3. 先校验，再用规范化后的值渲染；不允许无效值继续参与后续运算。
4. 没有诚实回退时，警告并**不渲染**；不编造内容、不发起网络请求、不输出不安全 URL。

| 阶段 | 无效输入处理 |
| --- | --- |
| `hugo server` / 普通本地构建 | 警告、回退或省略，其它页面继续可用 |
| CI / 版本验收 / 部署 | 同一警告在 `--panicOnWarning` 下让构建以非零状态退出 |

- 共享校验形状在 `layouts/_partials/validate.html`；领域 resolver 可加更窄规则，但保留同一套警告+回退契约。
- 安全边界：坏输出没有出现才是保护，而不是 Hugo 被终止。被拒 CSS 长度在进入 `style` 前回退；远程服务配置不完整时在浏览器可能发起请求前省略组件；不安全操作 URL 直接丢弃。
- 每个回退值都是公开契约的一部分，必须与主题声明默认值一致。负向测试要同时证明：普通构建存活 + 警告文案 + 渲染后回退 + 严格构建失败。
- 检查器必须直接验证被拒绝的输出（例如断言危险 URL 没有进入产物），不能把任意构建失败当充分证据。
- **没有通用键名重命名注册表**。需迁移诊断的过渡，在所属解析器加针对性警告 + 严格反向测试；已移除的键绝不能作为兼容路径继续读取。
- 可能联网的功能必须显式启用并以关闭方式降级：PlantUML 需 `plantuml.svg_image_url`，Draw.io 需 `drawio.drawio_server`，Algolia 需 `appId`/`apiKey`/`indexName`；不完整时警告且不产生网络请求。

### 配置模型（已接受决策）

保留 Hugo 原生键与仍有价值的 Docsy 兼容键，主题呈现/行为放 `params.ui.*`，页面覆盖用同名顶层 front matter 键。**不增加 `params.oink.*` 树**，不建遮蔽 Hugo 配置模型的注册表。

| 层次 | 职责 | 示例 |
| --- | --- | --- |
| Hugo | 站点身份、语言、菜单、输出、分类法、markup、模块 | `baseURL`、`languages`、`outputs` |
| 站点事实与集成 | 仓库、版本、作者、本地搜索、评论、外部服务 | `params.github_repo`、`params.version` |
| OINK 界面 | 外壳、导航、呈现、本地交互 | `params.ui.sidebar_*`、`params.ui.typography` |
| 页面/栏目 | 局部覆盖站点默认 | `sidebar_enabled`、`featured_image`、`share` |
| 数据文件 | 非开关的结构化事实/有序内容 | `data/landing`、`data/download`、`data/docs_nav.json` |

规则：页面覆盖去 `ui.` 前缀、其余名称一致（cascade 可套用到后代）；一个布尔够用就用标量；名称正向、snake_case、按功能分组；主题默认值声明在主题 `hugo.yaml`；每个功能族负责自己的规范化与校验，无全局兼容注册表。完整键表见配置参考，本决策不重复维护参数表。

## 界面本地化

- OINK 1.1 起为 Docsy 现有 **31 个 locale 文件名**提供原生界面文本，并额外保留通用 `zh` 作为简体中文默认（共 32 份语言包）。
- locale 集合：`ar az bg bn de en es et fa fi fr he hi hu it ja ko nl no oc pl pt-br ro ru sr-cyrl sr-latn sv tr uk zh-cn zh-tw`（加 `zh`）。
- `i18n/en.yaml` 管理 **194 条消息**的 schema；32 份语言包必须拥有完全相同的消息集与原生文本。只有经审查的产品名、标点、通行缩写或真实同形词可与英文相同，**不再生成整段英文 fallback**。
- `zh`/`zh-cn` 用简体中文，`zh-tw` 用繁体中文。
- Hugo 0.160.x 上，若同时存在地区化中文语言包，非默认语言的裸 `zh` 必须显式设 `locale: zh-CN`；0.161 起也能解析裸 `locale: zh`。这只影响语言配置，不改语言包文件名 `i18n/zh.yaml`。
- `%s`、`{count}`、`{{ .Count }}` 等占位符可移位但字节内容不变；取值都是标量。语言包不得含隐藏双向控制符（方向由站点 `direction: rtl` 决定）。
- `bin/check-i18n.py` 检查 locale 集合、schema、取值类型、占位符、方向控制符、已审查同形词。新增可见字符串必须在同一变更中补齐每份译文。

## 特色图片

Hugo 的 `images` 是唯一创作 API；`params.images` 只作全站社交卡片回退。

| 来源 | 阅读列表缩略图 | 社交卡片 |
| --- | --- | --- |
| 页面 `images`，或页面包中 `**featured*`、`*feature*`、`{*cover*,*thumbnail*}` | 是 | 是 |
| 分区 `cascade.images` | 是 | 是 |
| 站点 `params.images` | 否 | 是 |

- `images: []` 清除显式或 cascade 继承值，但**不禁止**发现页面包资源。只取解析到的第一张作代表图。
- `featured-image-resolve.html` 统一决定来源优先级与相对/绝对 URL：页面包资源优先于继承 cascade。列表缩略图、OG/Twitter/schema、作者头像、Pinterest、博客展示都消费同一决定。
- `params.ui.featured_image` 仅用于博客，默认 `none`；`banner` 在单页标题上方渲染，`wash` 给页头着色，`hero` 单页与分区索引绘制外壳背景。缺图或非 HTML 输出不渲染。

## 输出与运行时

每个基础模板都设置 `Page.Store.tdOutputFormat`：

| 输出 | 契约 |
| --- | --- |
| HTML | 完整语义内容；只为实际用到的能力加载本地运行时 |
| Print | 展开内容；不含外壳导航、搜索、图片缩放运行时 |
| Markdown / LLMS | 保持源 Markdown 形态，**不含 `td-` 组件标记** |
| LLMSFULL | 顶层 section 在自身 `outputs` 显式启用；每 section、每语言一份 `llms-full.txt`，按阅读顺序拼接同一份 Markdown |
| RSS | 安全静态摘要，或明确省略 |
| NAVJSON | 站点 `outputs.home` 启用；每语言一份 `navigation.json`，序列化侧栏/pager 所读权威链 |
| BookManifest | Book 根 `outputs` 显式启用；有序 JSON 交接，绝不冒充 EPUB/PDF |

- 各格式按既定顺序执行；Print 内 Hugo 可能并行渲染同一 Book 页面与重叠聚合，因此每页由一个缓存 coordinator 按固定顺序生成普通/整书两变体。
- 普通 Print 保留页面局部标题与带路由 xref；Book 聚合保留命名空间标题与文档内 xref。
- HTML 加载共享操作层、核心层，以及由页面 flag 选择的稳定第一方能力分片。需要模板化的能力每语言至多一份；flag 只决定引用哪些 script tag，绝不再生成组合 bundle。
- 顶层之下启用 `LLMSFULL` 会告警且不产出文件；普通构建可用，`--panicOnWarning` 拦住发布。NAVJSON：数组顺序即契约，`weight` 绝不序列化，标记 `notAlternative`；`schema/nav.v1.schema.json` 是手写契约产物，**不受生成式配置 Schema 漂移门禁管辖**。两者默认关闭，都不启用则构建结果逐字节不变。归属检查器 `bin/check-agent-indexes.py`。
- 出版为显式步骤：`bin/book-epub.py`、`bin/book-pdf.py`，门禁 `bin/check-book-epub.py`、`bin/check-book-pdf.py`。PDF 通过回环地址 + `script-src 'none'` CSP 调用显式指定的 Chrome/Chromium，输出带 CSS 页码的 A4。拒绝缺失/越出构建树的资源；网络资源与覆盖已有输出各需独立显式开关。网络 opt-in 只允许被动 HTTP(S) 媒体，远程脚本与本地文件协议仍非法。普通 Hugo 构建不执行出版。

性能规则要点：不为每页遍历 `.Site.Pages`（可用站点级资源或 `partialCached` 时）；`.Content` 只渲染一次后再读 Page Store 标志；直接输出正确标记，不扫 DOM 后修复；浏览器工作按资源 URL 分组；成本显著的普通输出保持选择启用；**默认不输出 Speculation Rules**（须先由一个生产消费站用可回滚 `moderate` 实验测量 `Sec-Purpose: prefetch` 请求、命中导航、传输字节与 CSP 影响）；只校验确实可达的作者输入。基线测量工具 `bin/measure-baseline.py`。

## 信任边界、CSS 与无障碍

- 作者可启用 Goldmark `unsafe`，但**配置与组件参数不能视作原始 HTML**。共享属性策略：允许清单、校验 class token、放行 `data-*`/`aria-*`；丢弃 `style`、`srcdoc`、`on*`、保留属性与未知属性时发警告。URL 帮助模板拒绝危险协议与协议相对 URL。
- 主题输出用 `td-` class、`data-td-*` 属性、`--td-*` 自定义属性；`.steps`、`.cards`、`.full-width` 等作者标记无前缀。
- 主题拥有的装饰图标带 `aria-hidden`；只有含任务列表或原始 Font Awesome 元素的页面才加载无作者内容无障碍修复。
- 阅读容器区分指针聚焦与键盘导航：指针聚焦的 main/表格滚动区/代码 `pre` 不会仅因随后按键出现边框；Tab、失焦或新的非指针聚焦清除豁免。滚动容器保留 `tabindex`，跳过导航目标在标题附近显示局部边框。
- 字体角色 `ui`、`body`、`heading`、`code`、`display`、`meta`、`brand`、`print`，通过 `--td-*-font-family` 暴露。`ui` 是主字体：`body` 经它解析、`heading` 又经 `body`，赋一次值同时移动界面/正文/标题（除非单独设了 `body`）。`params.ui.typography` 取 `technical` 或 `system`，编译到同一份样式表。`params.ui.fonts` 让配置层触达同一组角色，只写字体族名、绝不加载字体文件（留在网络契约之外），未知角色或不安全值只告警并单独丢弃。字体角色优先级：预设 → `typography: system` → head 输出的 `params.ui.fonts` → 站点 `_styles_project.scss`。
- 视觉预设：`params.ui.preset` 取 `paper`（1.2 默认）/`slate`/实验 `ink`/`terminal`；保留名 `folio`/`canvas` 与非法值告警回退 `paper`；**不支持页面级预设**。`params.ui.preset_menu`（默认 `false`）控制读者切换，`true` 提供 Paper/Slate/站点默认值，列表显式开实验且必须含站点默认值（缺失告警补入）。Hugo 给所有文档根（含 404 与打印）输出 `data-td-preset` 与 `data-td-site-preset`；开启选择时 head 内联脚本在 CSS 前校验 `td-preset`，选中站点默认项清除存储键，存储禁用时控件仍可用并提示。风格事件 `td-preset-change`（`{preset, previous, stored}`），明暗独立用 `data-bs-theme`/`td-color-theme`/`td-theme-change`。四套预设编入同一份样式表，Slate 保留 v1.1.0 色板。Giscus 色板跟随风格+明暗，打印用当前预设浅色白底，Mermaid/ECharts 只跟随明暗，API 组件保留供应商色板。
- 强调色按角色拆分：**强调文字**跟随 Bootstrap 链接族与 `--bs-code-color`（主题色永不重声明）；行内代码随预设变化（Slate 胭脂红对，Paper 墨色文字+淡底）。**强调底**跟随 `--td-accent`/`--td-accent-rgb`/`--td-accent-hover`。`params.ui.theme_color` 唯一注入这些底层。`theme_color`/`theme_color_dark` 取 `#rgb`/`#rrggbb`；解析失败告警并保留默认；解析成功但低于 4.5:1 的颜色带可抑制 id 告警并照常生效（建议性检查）。亮色是主键：无有效 `theme_color` 时 `theme_color_dark` 告警并被忽略；省略暗色一半时向白按 4% 步进提亮至 4.5:1。注入的每个字节都由解析出的整数通道格式化。

## 发布状态

源码完成、本地验证、提交、打标签、推送、消费站点固定版本、部署、生产一致是**彼此独立的状态**。一次本地 Hugo 构建只能证明本地验证通过。

## 组件契约

### 创作模型与公共 API

一个区块加属性即可表达时用普通 Markdown；需复合正文或 Markdown 无法携带的事实时用 shortcode。原生形态要求：

```yaml
markup:
  goldmark:
    renderer: { unsafe: true }
    parser:
      wrapStandAloneImageWithinParagraph: false
      attribute: { block: true }
```

只有 `{{% steps %}}` 使用百分号分隔符（正文属于页面大纲）；其它 shortcode 用尖括号。复合正文经 `content/render-block.html` 处理，使用唯一 ID 作用域。

**共 29 个 shortcode：**

- 核心：`tabs`、`tab`、`steps`、`cards`、`card`、`fields`、`field`、`include`、`kbd`、`badge`、`param`、`comment`、`contributors`、`asciinema`
- Book：`fig`、`tbl`、`eq`、`eg`、`xref`、`book-toc`、`book-figures`、`book-tables`、`book-equations`、`book-examples`
- 发布：`release-card`、`release-assets`、`download`
- OpenAPI：`swagger`、`redoc`

| 组件 | 原生形态 | Shortcode 形态 | HTML 运行时 |
| --- | --- | --- | --- |
| 提示块 | `> [!TYPE]`、折叠、`{icon=}` | 无 | 无 |
| 标签页 | 相邻围栏或表格加 `{tab= group= value=}` | `tabs`/`tab` | 只在使用页加载 tabs |
| 步骤 | 有序列表加 `{.steps}` | `steps` | 无 |
| 卡片 | 链接列表加 `{.cards}` | `cards`/`card` | 无 |
| 参数表 | 表格加 `{.fields}` | `fields`/`field` | 无 |
| FileTree | `filetree` 数据围栏 | 无 | 仅注释存在时加载分隔条运行时 |
| 画廊 | `gallery` 数据围栏 | 无 | 符合条件时共享图片缩放 |
| 图片 | Markdown 图片加块属性 | 无 | 符合条件时加载图片缩放 |
| 表格 | 属性、caption、编号或标签页 | 复合 Book 表格用 `tbl` | 只有标签页表格加载 tabs |
| Book 目标 | 图片、表格、passthrough、围栏加 `{num=}` | `fig`/`tbl`/`eq`/`eg` | 无 |
| 发布资产 | `checksums` 数据围栏 | `release-assets` | HTML 加载复制功能 |
| 图表与数据 | `mermaid`/`plantuml`/`markmap`/`math`/`chem`/`echarts`/`infographic` 围栏 | 无 | 只加载选中的本地运行时 |

### 校验与关键行为

- 命名参数与位置参数不能混用。Book 目标 ID 匹配 `[A-Za-z][A-Za-z0-9_.:-]*`，Book 编号匹配 `[0-9A-Za-z.-]+`，class 必须通过 token 校验。渲染钩子与 shortcode 共享同一页面注册表，冲突不产生重复输出 ID。URL 用 `content/url.html`。
- 提示块类型：`note`、`tip`、`important`、`warning`、`caution`、`success`、`danger`、`question`、`example`、`quote`、`details`；`-` 初始折叠，`+` 初始展开；未知类型以中性提示块保持可见。
- 标签页：只有连续且区块类型相同的相邻标签页才分组。`group` 启用 `#<group>-<value>` hash 与 `td-tabs:v1:<group>` 存储键。`tab.label` 必填；父级存在 `group` 时 `value` 才严格必填；孤立 `tab` 警告且不渲染。
- 参数表锚点为 `field-<name>`（小写、连续标点折叠为连字符），重复锚点追加位置后缀。
- 表格：`.matrix` 把第一列变为行表头；`.full-width` 加宽。`.fields` 不能与 matrix/full-width/编号/标签页组合；编号与标签页互斥。
- 图片：块图片带 `caption` 或 `num` 时变 figure。允许属性 `id`、`num`、`caption`、`width`、`height`、`link`、`command`、`options` 及共享安全属性。`command`/`options` 必须同时出现。缩放按钮通过 ARIA 无障碍名称保留 alt 与本地化预览操作，**不向正文插入辅助文字**。复制时不得带入预览提示。
- ECharts 是声明式 JSON/YAML；回调用 `window.OinkEchartsFunctions` 中的 `$fn:<name>`，绝不执行嵌入脚本。
- Swagger/Redoc 接受 HTTP(S) 规范 URL 或以 `static/` 为根路径，不解析页面资源。只有 HTML 输出可交互；Print/Markdown/RSS 输出静态规范链接。
- Book 类型扩展 docs 外壳；`book_number`、`book_part`、`book_kind`、`book_status` 是展示元数据，不改变 Hugo 发布状态。`eg` 需要 caption；不带 `num` 的 `eq` 是无编号展示公式。脚注属于页面文档；shortcode 正文是独立 Goldmark 文档，因此 `tbl`/`eg`/`fig`/`card`/`tab`/`field`/`include` 中的脚注引用会警告并保持字面形式。
- 发布：front matter 用单个 `release_url`（`https://github.com/<owner>/<repo>/releases/tag/<tag>`），owner/项目/tag 来自 URL，日期来自页面。**构建不抓取远程发布状态**。已移除的 `release` map、`release_products`、`release_group_by_product` 会警告并给替代项，不是兼容路径。
- 下载用 `data/download/<key>.yaml`，channel 取 `rolling`/`pinned`；只有 pinned URL 与命令行会插值 `${version}`、`${tag}`。发布前 rolling 保持可用，pinned 显示 pending。

## 外壳与导航契约

| 关注点 | 权威来源 |
| --- | --- |
| 全局导航 | Hugo `menus.main` |
| Docs / Book 侧栏与翻页 | 内容树或 `data/docs_nav.json` |
| 根栏目切换器 | 解析后的顶层内容根 |
| 内容发现 | 各语言的本地搜索索引 |
| 页面与命令面板操作 | 共享操作注册表 |

任何功能都不能引入另一套菜单或页面树。菜单只允许一层子项；更深层警告并平铺到带链接的分组标题下。**mega 面板与 `columns` 菜单参数已退役**，配置 `columns` 会警告并保持单列。`navbar_autohide` 从 768px 起只对精细指针生效。

- 侧栏与翻页共享同一根和顺序。`manual_link`、`build.render: link`、分隔行、隐藏节点、占位节点保留各自语义。`sidebar_icon_policy` 取 `all`（默认）/`groups`/`none`；图标是一对 Font Awesome class。
- 根候选先收集可链接非分隔顶层分区，再收集 `sidebar_root_for: self` 分区，按 URL 去重；两种来源都遵守显式 `sidebar_root_menu: false`（未设置或 true 保留）。当前解析出的根即使被排除也仍追加。零入口不输出控件，单入口输出静态链接。
- `sidebar_divider` 叶子保持静态标题；分区节点在两套遍历器中保留子项，标题不跳转，启用折叠时提供真正展开按钮。配合 `build.render: never` 可省略分区自身输出而不隐藏后代。`toc_hide` 隐藏整棵子树，不能代替分组。

### 侧栏运行时 API `window.OinkSidebar`

OINK 1.1 起提供；1.0.0 无此 API。管理已注册树分支及可搬迁的 TOC、反向链接、分类法分组，**不依赖当前 DOM 父节点**。

```js
// 有效目标返回 true；未知 ID 或非布尔值返回 false
window.OinkSidebar.setExpanded(id, boolean, { source })

// 返回新的 {id, expanded} 快照，或 null
window.OinkSidebar.getState(id)

// 初始活动路径补全与响应式搬迁完成后解析为 API
await window.OinkSidebar.ready
window.OinkSidebar.isReady            // 同步检查
document.addEventListener('oink:sidebar-ready', handler)
```

- ID 使用现有 `aria-controls` 指定的受控区域 ID；不能修改注册范围之外的元素。
- `source` 取 `user`、`active-path`、`responsive` 或默认 `api`。
- 写入顺序：先提交 `aria-expanded`、`td-is-open`、本地化标签、区域 `inert` 状态，再向 document 发一次 `oink:sidebar-disclosure`（`detail: {id, expanded, source}`）。**重复写入相同状态不发事件**。
- API 恢复时保留当前路径祖先展开，用户仍可主动折叠；关闭含焦点区域时先把焦点归还展开按钮再隔离。
- 桌面折叠/移动抽屉关闭时面板设 `inert` 并标 `aria-hidden`；先移出焦点再隔离，打开时先解除隔离再聚焦。面板本身继续充当 16px 指针感应区。
- 持久化由站点负责：等待 `ready`，在 try/catch 中读存储，再通过 setter 恢复有效 ID。**OINK 自身保存整栏折叠、宽度与滚动位置，不定义读者分支选择的版本/语言存储格式**。
- 运行时属性不进入无 JavaScript 的服务端回退标记；无 JS 时静态标记仍可见，运行时只补 active 路径。

### 沉浸式博客

OINK 没有 article 类型。沉浸式阅读由四个独立键组成（可设页面或 cascade）：`featured_image: hero`、`toc_style: flow`、`toc_taxonomies: false`、`sidebar_enabled: false`。博客外壳默认不渲染面包屑。`toc_style` 取 `fixed`/`flow`；`flow` 在文章旁放更宽导轨且只在滚动后固定，无 JS 时从文章起点开始。`toc_taxonomies: false` 移除术语云；导轨既无 TOC 又无术语云时完全不渲染。

### 搜索、操作与运行时

- `params.offline_search` 选择启用各语言本地索引；启用后默认也在 `hugo server` 期间构建，大型编辑循环可设 `offline_search_on_serve: false`。夹具预算原始 2 MiB、gzip 512 KiB。
- 内置操作 ID：`copy_markdown`、`copy_link`、`open_chatgpt`、`open_claude`、`view_markdown`、`view_history`、`edit_page`、`create_child_page`、`create_issue`、`create_project_issue`、`print_section`、`print`、`switch_preset`（1.2 新增，独立于 `switch_theme`）、`switch_theme`、`switch_language`、`switch_version`、`open_github`。站点命令只能打开安全 URL 或调用内置 ID，**绝不能注入 JavaScript**。
- 命令面板有空状态/文本搜索/`>` 命令状态；无历史、无语义搜索、无个性化、无远程回退。查询留在浏览器内，默认不发遥测。
- 键盘：`/`、`\`、`f`、`c` 打开搜索或命令；`j`/`k` 移动标题；`q`/`e` 翻页；`h` 改变展示；`l`/`y`、`t`、`r` 打开语言/主题/根栏目。从子页按 Left/`a` 先聚焦父分组再按一次折叠；Right/`d` 展开或进入第一个可见子项；上一页/下一页只遍历链接。
- `params.ui.scroll_spy` 与页面键 `scroll_spy` 在整个 1.x 期间是**静默兼容 no-op**，不加载独立运行时，只有未来破坏性版本才删除。

### 搜索尾部扩展（OINK 1.1 起）

受信任站点 JavaScript 可调用 `OinkCommandPalette.registerSearchTail({id, rows, activate})`。

- ID 必须唯一且符合 `[A-Za-z0-9][A-Za-z0-9_-]*`，并提供两个函数；非法或重复注册抛异常。返回的注销函数可重复调用；旧句柄不能删复用该 ID 的新注册。
- `rows(context)` 同步返回描述符。context 是冻结快照 `{query, locale, phase, pageResultCount}`：`phase` 取 `results`/`empty`/`error`。仅在非空文本搜索完成后调用；扩展行按注册顺序放在本地化 Actions 组中，排在所有原生页面与操作之后。
- 描述符需扩展内唯一 ID + 非空字符串 `title`；可选 `description`/`icon`/`disabledReason`（字符串）、`available`（布尔，默认 true）。非法/重复/异步/抛异常时本轮跳过整个扩展，其他扩展不受影响。
- `activate(row, context)` 只经普通结果行激活路径调用，另带 `AbortSignal` 与 `handoff()`。操作待完成时阻止其他结果行激活。同步异常/Promise 拒绝会释放 pending、保持面板打开并播报本地化失败信息。调用 `context.handoff()` 关闭面板但不归还焦点、不取消本次激活。`rows()` 必须保持纯净——这是受信任代码契约，不是安全沙箱。

### 分享、注记、作者与系列

- `params.ui.share` 默认空，接受 16 目标任意有序子集：`x`、`bluesky`、`mastodon`、`facebook`、`linkedin`、`reddit`、`hackernews`、`telegram`、`whatsapp`、`line`、`pinterest`、`weibo`、`chatgpt`、`claude`、`email`、`copy`。`share: false` 退出；未知项警告并丢弃。只有普通页面渲染分享栏；不加载平台 SDK/iframe/脚本/计数器。Discord 有意不提供。
- 注记行顺序：最后修改（设 `Lastmod`）→ 上游（`upstream_link` 非空）→ 翻译（权威语言存在译文且本页含作者正文）。上游事实按 站点参数 → `data/upstreams[upstream_source]` → front matter 解析：`upstream_name`、`upstream_copyright`、`upstream_license`、`upstream_notice`，以及可选 `upstream_ref`、`upstream_modified`。存在链接时前四项必填；无效/残缺署名警告且不渲染法律声明；发布门禁 `--panicOnWarning` 拒绝这类警告。
- 分类法图标词汇表由 `taxonomy-icon.html` 独家拥有（如 `folder-open`/`folder`、`tags`/`tag`、`cubes`/`cube`、`users`/`user-pen`、series 用 `book-bookmark`/`book`）。`params.ui.taxonomy_icons` 可覆盖；无效输入警告并保留内置。
- 作者需声明 `taxonomies: {author: authors}`；`authors` 无警告胜过旧 `author`。系列需声明 `taxonomies: {series: series}`；用 `series: [name]` 与可选 `series_weight`。

### 博客索引与页脚

- `params.ui.blog_index`：`list`（默认）/`cards` 是按最新优先的扁平结果，共享 `blog_index_size` 分页；`table` 把整个分区显示为日期/标题/标签行且不分页。
- `params.ui.blog_index_toggle` 为当前分页切片渲染三种形态，读者可循环切换；配置值控制首次绘制。无切换器的 `table` 仍是完整不分页归档。
- 页尾顺序：分享、反馈、注记、翻页、评论。Docs/Book 翻页遵循侧栏前序遍历；Blog 按 weight 后接日期倒序；`pager: false` 退出。静态输出省略翻页 UI。
- 每种页脚形态在最底层栏右侧保留纯图标工具组，顺序为版本、语言、主题、快捷键帮助；低于 `lg` 时改三行全宽居中堆叠，工具组在末行。`footer_style: none` 移除整条底栏。

## 落地页契约

任何普通页面可声明 `layout: landing`：渲染顶部导航栏、全宽画布与页脚，不显示 docs 侧栏或 TOC 导轨。首页继续用 `data/home/<lang>.yaml` 作为兼容创作路径，走同一渲染器。

- 非首页依次从内联 front matter、`data/landing/<key>/<lang>.yaml`、单个 `data/landing/<key>.yaml`、英文或无后缀本地数据的精确匹配条目解析 `sections`。**绝不抓取可变事实**；星标数、价格、截图、头像必须在 Hugo 运行前提交或生成。`params.ui.landing_search`（默认 true，仅当启用 `offline_search` 时打开命令面板）。
- 注册表恰好 **22 种内置区块**：`hero`、`metrics`、`capabilities`、`principles`、`cards`、`logo-wall`、`gallery`、`testimonials`、`contributors`、`faq`、`markdown`、`cta`、`pricing`、`pricing-compare`、`command-box`、`steps`、`timeline`、`code-plate`、`preview`、`case-study`、`download`、`bar-chart`。
- 条目可为类型字符串，或含 `type`、`key`、`id`、`enabled`、内联 `data` 或本地 `partial` 的 map。未知类型警告并安全回退（`--panicOnWarning` 拒绝）。已移除的 `home/` partial 名称不是 API。
- `hero.align` 取 `start`/`center`；Center 只适用于文本，与图片组合时警告并回退 `start`。`download` 消费与 shortcode 相同的 `data/download/<key>.yaml`。
- 叙述文件按语言拆分：依次解析 `<field>_<exact language>`（`-` 规范为 `_`）→ `<field>_<primary language>` → 无后缀。不接受 camelCase 别名。
- 输出：HTML 完整静态区块+渐进增强；Print 静态网格与内容、移除控件；Markdown 无主题 class 的标题/正文/列表/表格/代码；RSS 省略落地页区块。

## 迁移边界：OINK 0.4 → 1.2.0

> 本契约描述 v1.2.0 的正式行为；唯一中英文契约源在主题仓库 `content/docs/design/`。1.2.0 除默认外观变 Paper 外不改内容源码。

这是源码与配置指南，不是版本发布流水账。工具 `bin/migrations/oink06.py` **只扫描/自动改写站点内容目录下的 Markdown 文件**（含受支持 YAML front matter），不改配置、数据、布局、资源、模块或生成输出；TOML/JSON front matter 与有歧义的 Markdown 会连位置一起报告，留人工检查。1.2.0 起保留列表与引用块中嵌套的围栏示例（包括示例里字面的引用与围栏标记）。批量升级既有站点固定的模块版本用 `bin/update-consumers.py`（随 1.2.0 发布，见 `admin.md`）。

```sh
python3 bin/migrations/oink06.py report --sites <dir>... --md report.md --json report.json
python3 bin/migrations/oink06.py migrate --site <dir>          # 默认 dry-run
python3 bin/migrations/oink06.py migrate --site <dir> --write
python3 bin/migrations/oink06.py check --site <dir>
```

迁移完成后幂等；代码围栏不改写。`book_figures.py` 只保留 TPME、DDIA v1/v2 与 pg-internal profile，不是通用解析器。

### 内容：已移除形态 → 当前形态

| 已移除形态 | 当前形态 | 工具键 |
| --- | --- | --- |
| `alert`、`details`、`pageinfo`、原始 disclosure | `> [!TYPE]` 提示块 | `callout` |
| `tabpane`、旧 `tab`、`code-group`、`code-tab` | 相邻 `{tab=}` 区块，或 `tabs`/`tab` | `tabs` |
| FileTree shortcode 或 `{.filetree}` 列表 | `filetree` 围栏 | `filetree` |
| Gallery shortcode 或 `{.gallery}` 列表 | `gallery` 围栏 | `gallery` |
| ECharts / infographic shortcode | 同名数据围栏 | `datafence` |
| Docsy 卡片家族 | `.cards` 列表或 `cards`/`card` | `cards` |
| `imgproc`、`image` | Markdown 图片加属性 | `image` |
| `readfile` | `include` | `include` |
| 围栏 `filename=` | `title=` | `fencetitle` |
| `badge outline=` | 移除 `outline` | `badge` |
| 叶子 `example`、`book-figures kind=` | `eg`、显式 `book-*` 索引 | `eg` |
| 百分号分隔的 fields | 尖括号分隔的 `fields`/`field` | `fieldsdelim` |
| Docsy `_param` 占位符与 `card header=` 高亮 | Font Awesome / `badge` / `param` 或提示块 | `param_placeholders` |
| 不支持的旧 shortcode | 报告源码位置，人工检查 | `reportonly` |

### 配置与 front matter（需手工处理）

| 旧配置 | 当前配置 |
| --- | --- |
| `offlineSearch*` | `offline_search*` |
| `disable_click2copy_chroma` | `ui.code_copy`，取反 |
| `content_width` | `reading_width: slim \| normal \| wide` |
| `github_url` | `github_repo` |
| `ui.no_left_sidebar` | `ui.sidebar_enabled`，取反 |
| breadcrumb 别名 | `ui.breadcrumb` |
| `ui.scrollSpy` | 无行为替代；`ui.scroll_spy` 仅作 1.x 静默兼容 no-op |
| `ui.showLightDarkModeMenu` | `ui.dark_mode.show_menu` |
| `ui.readingtime` | `ui.reading_time` |
| `ui.ul_show` | `ui.sidebar_expand_levels` |
| `ui.docs_root` | `ui.docs_sidebar_root` |
| `ui.pager` | `ui.pager_types` |
| annotation/zoom/keyboard/reading 的 `{ enable: bool }` map | 裸布尔值 |
| `ui.typography.preset` | `ui.typography` |
| `print.disable_toc` | `print.toc`，取反 |
| `algolia_docsearch` | `search.algolia` |

Prism、`rss_sections`、`algolia_docsearch` 已移除；**Chroma 是唯一高亮器**。旧 `hide_feedback`、`hide_readingtime`、`exclude_search`、`content_width`、camelCase 手工链接、嵌套 front matter `ui` map 会连替代项一起报告。

### 0.5 → 0.6 变更

- 用 `upstream_link` + `upstream_name`/`upstream_copyright`/`upstream_license`/`upstream_notice` 替代 `upstream_attribution`；`downstream_modified` 改名为 `upstream_modified`。
- 用单个 GitHub `release_url` 替代 `release` map；从发布索引移除 `release_products`、`release_group_by_product`。
- 博客与默认日期改用 ISO `2006-01-02`；面向读者的日期继续显式保留 `time_format_blog`/`time_format_default`。

已移除名称会警告并采用安全回退或不渲染；普通预览可继续，严格门禁 `--panicOnWarning` 拒绝。`blog_index_toggle`、`featured_image: hero`、`toc_style`、`toc_taxonomies` 是增量选择启用项，不引入内容类型。

### 前置条件与验证

- 按组件契约启用 Goldmark unsafe、块属性、独立块图片。要用 `\(...\)`、`\[...\]`、`$$...$$` 需显式启用 passthrough；**Hugo 不合并主题的 markup 配置**。
- 针对改动的契约，用固定 Hugo Extended 0.165.0 工具链跑范围最小的源码与输出检查；运行时变化跑 JS 测试；严格构建根路径与子路径。维护范围内站点在桌面与窄视口检查有代表性的 EN/ZH Docs 与 Blog 路由，再分别记录固定版本、部署、线上一致状态。

## 配置权威与生成式 Schema 漂移门禁

主题已有**两个配置权威**：`hugo.yaml`（注释旁声明每个默认值）与 `check-params.py` 的读取点扫描（知道模板实际消费的每个键）。

`bin/generate-config-schema.py` 从这两者投影生成 `schema/` 下两个只读产物：

| 产物 | 校验对象 | 来源 |
| --- | --- | --- |
| `schema/site-params.schema.json` | 站点 `hugo.yaml` | 类型/默认值取自主题 `hugo.yaml`，描述取自其注释块 |
| `schema/front-matter.schema.json` | 页面 front matter | 模板作为创作面读取的全部键；描述继承对应站点键 |

两个刻意的克制：

- **front-matter Schema 不带类型约束**——多个键在站点类型外还接受裸布尔退出（`share: false`、`theme_color: false`），对合法输入画红线比没有提示更糟。
- `hugo.yaml` 读取器只解析该文件实际使用的形态（嵌套映射、标量、行内列表）；读不懂的构造是硬错误，超出能力时漂移门禁大声失败。

**漂移门禁**：`python3 bin/generate-config-schema.py --check` 在内存中重新生成，`schema/` 过期或缺失即失败；主题 CI 放在参数契约检查旁边。改变 Schema 的唯一途径是改 `hugo.yaml` 或所读模板——公开配置面变化时 Schema 在同一次提交再生。代价：生成器与读取点扫描成为公开配置面的隐含门禁，新增参数键必须能被它们理解，否则 CI 直接失败。仅为提示「已重命名/已移除」而读取的键按名排除。

> 注意：`schema/nav.v1.schema.json`（NAVJSON 格式）是**手写契约产物**，不受本漂移门禁管辖，随模板与检查器一同修改。

## 设计与创作决策（摘要）

| 决策 | 核心选择 |
| --- | --- |
| 警告与安全回退 | 见上文「诊断策略」；归属参考 `bin/check-params.py` + 严格构建 |
| 配置模型 | 延长 Hugo/Docsy 兼容面，不另造 `params.oink.*` 或全局 resolver |
| Markdown 优先创作 | 原生 Markdown 优先，shortcode 只补真实能力缺口；沿一条系统延长 |
| 生成式配置 Schema | 只读投影，CI 漂移门禁阻止第三个配置权威 |
| 视觉预设（1.2） | Paper 成默认、Slate 保留旧外观、外观菜单分离风格与明暗；Ink/Terminal 显式实验。归属 `check-presets.py`（token 对称、AA 色板、冻结的 Slate v1.1.0 色板）+ 文档站 `appearance.spec.mjs` |

Markdown 优先创作的输出契约：只有在每种已启用输出（HTML/Print/Markdown+LLMS/RSS）都得到明确语义结果，一种创作形态才算完整——避免漂亮的 HTML-only 组件破坏 Agent 输出、订阅源或整书打印。提议新组件时，必须先说明 Markdown + 既有渲染钩子为什么不够。原生形态背后的 Goldmark 事实记录在块属性研究。

决策记录格式：背景、选择、后果、证明选择仍成立的证据；每份决策链接归属契约与验证面，中英文必须同步修改。旧答案留在 Git 历史与变更记录，**不在导航树并列保留两套「现行」答案**。

## 研究证据（摘要）

研究无规范效力；只记录维护者可复核方法与边界。

- **Goldmark 块属性实测**（Hugo 0.160.1 与 0.164.0，字节一致）：有序列表加 `{.steps}` 的 class 落最外层 `<ol>`；独占图片加 `{#id num= caption=}` 使 `render-image` 收到 `IsBlock=true` 与全部属性；块公式/表格/围栏/callout 均能收到属性；属性行与目标块之间**隔空行会使属性静默消失**（源码检查必须拒绝孤立属性行）。容器边界：`%` delimiter 的 `.Inner` 前后各需空行；多行 `%` 容器不能放进 CommonMark 列表项，故列表项内需嵌套全量容器时保留全量 Steps 形态。属性可见 ≠ 公开属性，每钩子有白名单。
- **消费站与迁移证据（2026-08）**：11 个消费站共 **5,325 个 Markdown**（5,293 带 front matter）；**11,484 张 pipe table 中仅 11 张匹配严格 Fields 表头**，故用显式 `.fields`/`.matrix` marker 而非按形状猜测；18 个 Steps 块全用全量形态。确定性 Book 迁移干跑 profile（DDIA v1/v2、TPME、私有 Book）第二次执行变更数为零；2026-08-24 DDIA 与 TPME 跑通通用 EPUB/PDF 链路。
- **2026-08-26 全面审查**：4 P1 / 9 P2 / 5 P3。共同原因：已有原则很强，但早期/边缘实现未接入，门禁只证明正向场景不回归。P1 含 Swagger 隐式在线 validator、非法配置击穿普通预览、OpenAPI/Asciinema HTML-only 岛、Landing 未验证数据进 `safeCSS`。**F01–F06 已由 0.7.1 修复**，发现应读作促成修复的证据；路线分阶段 0/1/2。
- **2026-09-19 社区调研**：PR 43 = `sidebar_root_menu: false` 过滤遗漏；#41 = 隐藏侧栏仍可聚焦 + 缺公开 API；#44 = 指针聚焦后按键出现边框（机制符合预期，只改进焦点样式）；#42 = 隐藏与分组选项区别；#40 = 搜索尾部扩展（受限 API 需求）。均已实现并接受契约。
- **2026-09-20 发布准备审查**：复现修复五项 P2 运行时缺陷（`08f6563`）：侧栏就绪早于活动路径补全、待完成操作可进入原生选择菜单、右侧 TOC 整栏折叠后仍可聚焦、方向键跳过无链接分组、抽屉焦点循环计入 inert 后代。验证快照：JS 单测 44、站点 `make check` 57、`make browser` 149（八组 Chromium）。**v1.1.0 已于 2026-09-20 从提交 `3a18234` 发布**，模块校验和 `h1:121L5g57ChRCPyidzEBBcln2Co+0zYRQ+XDDXjymd0Q=`。
- **2026-10-05 视觉预设验收**：`check-presets.py` 覆盖三类背景的正文/链接/强调色 AA、浅深 token 对称、建议性背景亮度与**冻结的 Slate v1.1.0 基础色板**；七次严格构建、28 个文档根元素。文档站 `appearance.spec.mjs` 检查真实输出（含 404 与打印）。Paper/Slate 用真实主题输出截图评审；10 月 4 日注入样式的截图是研究原型，与 10 月 5 日真实输出分开看待。
- **2026-10-05 Ink/Terminal 实验**：在真实主题输出中提供显式实验预设（直角/2px 圆角、紧凑桌面导航），复用现有本地字体、状态管理与无障碍控件；图表与 API 组件仍只随明暗变化。仍未晋升为稳定默认选项。
- **v1.2.0 发布**：2026-10-05 从 `main` 发布（GitHub Releases `v1.2.0`），带来 Paper 默认、四套风格、独立风格/明暗外观菜单、本地 IBM Plex Sans、搜索/导航/SEO 修正与更受保护的出版维护工具。文档站与 CLI 文档仍分别固定各自的已发布基线。

## 候选提案（摘要）

提案非规范材料，不能当配置参考。

| 提案 | 状态 | 边界 |
| --- | --- | --- |
| 反向链接与知识图谱 | G1 已实现（0.8.0）；G2/G3 草案 | G1：从普通 Markdown 链接与 `ref`/`relref` 派生静态入链；右栏 aside 组，默认展开前 8 条、其余收进原生 disclosure；站点键 `params.ui.backlinks`（裸布尔，默认关闭），页面键 `backlinks`；按稳定页面路径单键排序；无入链不渲染。G2 复用内置 ECharts 局部图，G3 全站图 + opt-in JSON 输出 |
| 媒体收敛 | M1/M2 已实现；M3 已决议；M4 开放 | M1 共享 media-result 契约；M2 Landing 资源元数据；M3 = 方案 2：图片处理只属原生 Markdown 图片，全量 `fig` 保持容器语义、参数表刻意不含 `command`/`options`；M4 兼容标记退役待消费方盘点 |

已经退役的提案：Agent 批量索引（稳定行为归架构、用户步骤归 Agent 就绪输出）、Book 出版（归架构与创作书籍）、生成式配置 Schema（归配置总览与决策）。

提案生命周期：草案 → 拒绝/被替代（由 Git 历史保存）或接受（实现 + 归属检查器 + 中英契约 + 稳定理由进 Decisions）；接受后**不自动成为第二份契约**，须退出活动导航。新 PRD 以 `<slug>.md` + `<slug>.zh.md` 放入 `content/docs/design/proposals/`，用显式稳定英文标题 ID。
