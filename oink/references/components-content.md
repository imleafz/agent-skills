# 内容类组件

来源：https://oink.pgsty.com/zh/docs/components/（OINK v1.1.0 文档）

覆盖：callout、image、code、tabs、table、fields、steps、cards、filetree、badge、kbd。

## 通用约定

OINK 组件默认是 **Markdown 原生语法 + 一行属性**，只有需要富文本正文的场景才用 shortcode。

- **围栏属性写在信息行**：` ```lang {…} `，属性跟在开栏行的语言之后。
- **块属性写在块的下一行**：表格、图片、列表标记（`{.fields}` / `{.steps}` / `{.cards}` / `{.matrix}` / `{.full-width}`）都写在块结束后的紧邻下一行。
- **属性行必须紧贴块**：中间空一行，属性就变成正文里一段可见的花括号。Prettier 等格式化工具常移动这一行，用 `<!-- prettier-ignore-start -->` / `<!-- prettier-ignore-end -->` 包住。
- 块级属性需要 Goldmark 属性块支持（图片额外需要第三项）：
  ```yaml
  markup:
    goldmark:
      parser:
        attribute:
          block: true
          # 图片块级属性额外需要：
          wrapStandAloneImageWithinParagraph: false
      renderer:
        unsafe: true
  ```
  缺 `wrapStandAloneImageWithinParagraph: false` 时独立图片被包进 `<p>`，属性行当作正文。
- **严格发布构建**（`HUGO_ENV=production` 等）把普通预览里的告警升级为失败，无效属性/取值必须修掉，不能只靠回退。

---

## callout 提示块

用 `> [!TYPE]` 块引用写出带颜色、图标与标题的提示、警告与折叠块，不需要 shortcode。正文是页面级 Markdown（列表、围栏、表格、图片、嵌套提示块），**每一行都以 `>` 开头，围栏也不例外**。

最短可用语法：

```markdown
> [!NOTE]
> Hugo Module 需要本机安装 Go；只用离线归档时不需要。
```

- 类型名不区分大小写；不写标题时用本地化类型名（中文「注意」，英文 "Note"）。
- **类型**：`NOTE` `TIP` `IMPORTANT` `WARNING` `CAUTION`（与 GitHub 一致）+ `SUCCESS` `DANGER` `QUESTION` `EXAMPLE` `QUOTE`（OINK 追加）+ `DETAILS`（无颜色折叠块）。未知类型不报错、不丢内容，整块渲染为普通块引用，`[!TYPE]` 原样可见。
- **自定义标题**：标记同一行的后续文字是标题，支持行内 Markdown。
  ```markdown
  > [!WARNING] 会改写 `public/`
  > 生产构建前先确认 `baseURL` 指向正式域名。
  ```
- **折叠**：类型后加 `-` 默认收起、加 `+` 默认展开，渲染为原生 `<details>`；`[!DETAILS]` 不加符号即收起。折叠状态不持久化。
- **嵌套**：每层多一个 `>`，建议最多一层。

### 标记行 `> [!TYPE]±  标题`

| 参数 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `TYPE` | 枚举 | — | 上列十一种；大小写不敏感；未知值渲染为普通块引用 |
| `±` | `-` / `+` / 无 | 无 | `-` 折叠默认收起，`+` 折叠默认展开；`DETAILS` 不加符号即收起 |
| 标题 | 行内 Markdown | 类型的本地化名称 | 与标记同一行 |

### 属性行（块引用之后紧接的一行）

| 参数 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `icon` | Font Awesome class 对 | 类型默认图标 | 例如 `fa-solid fa-database`；`DETAILS` 默认无图标 |
| `class` | 空格分隔的 class | — | 原样透传给站点 CSS |

```markdown
> [!TIP] PostgreSQL 18 已支持
> 从 Pigsty v4 起默认安装 PostgreSQL 18。
{icon="fa-solid fa-database"}
```

### 坑与告警

- 属性行只接受 `icon` 与 `class`；`style`、`on*` 与其它键告警并忽略，严格发布构建拒绝。
- 经过 Prettier 的文件在标题行下保留一个空的 `>` 行，否则工具会把标题并入正文。
- 不能自定义颜色（颜色由类型决定）；折叠状态不持久化。

---

## image 图片

用普通 Markdown 图片语法写图，加一行属性得到图注、尺寸、缩放、链接、编号与 Hugo 图片处理。主题没有图片 shortcode。

最短可用语法：

```markdown
![OINK 文档外壳：侧栏、正文与目录三栏](oink-shell.webp)
```

- 独立成段的图片可跟一行 `{…}` 属性，成为 figure / 缩放候选 / 编号图 / 派生图。
- 页面包内图片读取固有尺寸写入 `width`/`height`，避免跳版；所有图片懒加载。
- 替代文字应始终填写；空 alt 表示装饰图，缩放会跳过它。
- **行内 vs 块级**：夹在文字中的是行内图，渲染为一个 `<img>`，不能带属性；独立成段的是块级图，可带属性行。无固有尺寸的 SVG 行内插入会被拉伸，应作为块级并给尺寸。

### 来源解析顺序

| 放法 | 源码里怎么写 | 适合 |
| --- | --- | --- |
| 与页面同目录（页面包） | `![…](oink-shell.webp)` | 只有这一页用的截图；随页面移动 |
| 全局资源 `assets/images/…` | `![…](images/logo/oink.webp)` | 多页共用、还要处理（缩放/裁切）的图 |
| 静态目录 `static/images/…` | `![…](/images/hero-light.webp)` | 不需处理的大图；拿不到尺寸时用 `width`/`height` 补 |
| 远程 URL | `![…](https://example.com/a.png)` | 少用：构建期不下载，也不能处理 |

相对路径先按页面资源、再按全局资源查找，都找不到时按静态路径原样输出；主题不检查静态路径与远程 URL 是否存在。

### 处理型图片

`command` 与 `options` 必须同时给出；命令为 `Fit` `Resize` `Fill` `Crop`，选项是 Hugo 图片处理字符串。

```markdown
![文档外壳缩略图](oink-shell.webp)
{command="Fit" options="300x150" caption="Fit 300x150：按比例装进 300×150 的框"}
```

- 渲染出的 `src` 是派生图；启用缩放时对话框打开原图。
- 静态路径、远程 URL 与 SVG 不能处理，写 `command` 会告警并保留未处理图片。选项语法（`300x150 webp q80` 等）见 Hugo 图片处理文档。

### 链接 / 编号 / 缩放

- 图片本身是链接用 `[![alt](src)](href)`；有图注的 figure 整体可点用属性行 `link="…"`（必须同时有 `caption` 或 `num`）。带链接的图不参与缩放。
- 编号图（书籍/长手册）：属性行加 `num`，可选 `#id`。编号是作者书写的字符串（`2-1`、`3.4`），主题不自动计数；图注前加本地化「图 2-1」前缀，`#id` 缺省 `fig-<num>`。
  ```markdown
  ![发布卡片](release-note.webp)
  {#fig-release num="2-1" caption="发布卡片：版本、日期与资产"}

  见[图 2-1](#fig-release)。
  ```
- 缩放默认关闭，站点开启后块级图/figure/画廊中带 alt 的图成为可点击按钮（原生 `<dialog>`，Esc 关闭）。行内图、alt 为空的装饰图、带链接的图、`data-no-zoom` 标记的图不缩放。
  ```yaml
  params:
    ui:
      image_zoom: true
  ```
  某页单独关闭：front matter 写 `image_zoom: false`。
- 深浅色图片：主题无参数。各写一个 `class`（`only-light` / `only-dark`），在站点 CSS 中按 `[data-bs-theme="dark"]` 显示其一。

### 属性行参数（块级图片下一行）

| 参数 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `caption` | 纯文本 | — | 有它就渲染成 figure；不解析 Markdown |
| `#id` | 标识符 | 有 `num` 时 `fig-<num>` | `[A-Za-z][A-Za-z0-9_.:-]*`；作为锚点与 Book 目标 ID |
| `num` | 字符串 | — | `[0-9A-Za-z.-]+`；注册为 Book 图目标，图注加「图 N.」前缀 |
| `width` / `height` | 正整数 | 资源固有尺寸 | 覆盖尺寸；静态/远程图靠它避免跳版 |
| `command` | 枚举 | — | `Fit` `Resize` `Fill` `Crop`；必须与 `options` 同给；仅页面/全局资源 |
| `options` | 字符串 | — | Hugo 图片处理选项，如 `600x300`、`300x150 Left`、`800x webp q80` |
| `link` | URL | — | 把 figure 包进链接；需要 `caption` 或 `num`；带链接的图不缩放 |
| `class` | class 列表 | — | 透传给站点 CSS |
| `data-*` / `aria-*` | 字符串 | — | 透传 |

### 坑与告警

- `style`、`on*`、`alt`、`title`、`src` 与不支持的键出现在属性行时告警并忽略；严格发布构建拒绝。alt/title/src 属于 Markdown 图片本身。
- `title` 不是图注：`![a](b "c")` 的 `c` 是悬停提示。
- 图注不含 Markdown：公开字符串参数都是纯文本；富文本说明写在图片下方段落。
- 构建期不下载远程图片；静态图需要处理时移到页面包或 `assets/`。
- 缩放不支持拖拽、平移、上一张/下一张；一组相关图用 gallery。

---

## code 代码块

普通 Markdown 围栏加一行属性，得到文件名标题、精确复制、行号、高亮、换行、折叠与可链接的行。高亮由 Hugo 内置 Chroma 在构建期完成。

最短可用语法：

````markdown
```sql
SELECT datname, numbackends FROM pg_stat_database ORDER BY numbackends DESC;
```
````

- 没有属性的围栏同样有完整外壳与复制按钮；无标题栏时不渲染空白横条。
- 语言标记就是 Chroma 的 lexer 名；补丁用 `diff` 围栏（Chroma 的 `.gi`/`.gd` 是增删行样式）。
- **标题**：`title` 加可见标题栏（通常写文件名），同时是块的无障碍名称。`filename` 是历史别名，两者同写时告警并用 `filename`。
- **换行**：`wrap=true` 只改变显示，源码与复制文本不变；不加时长行横向滚动。与表格行号不能共存。
- **折叠**：`collapse=N` 初始只显示 N 行，底部给「显示全部」按钮；服务器输出完整代码，折叠是浏览器视觉裁切。
- **复制**：默认复制整块源码。终端会话（`console`、`shell-session`）默认只复制命令（`copy="command"`）；连提示符与输出一起复制写 `copy="all"`；`copy=false` 关掉本块的复制按钮。多行命令请在续行里写出续行提示符（通常是 `>`）。
- **标签页**：连续几个带 `tab` 的围栏合成标签页集，第一个围栏上的 `group` 让它可分享、可同步、可记住选择。
- **编号例**：`num` 加 `caption` 成为一条 Book「示例」目标，可被 `xref` 引用，`id` 默认 `eg-<num>`；`num` 与 `caption` 必须成对，`num` 与 `tab` 互斥。

### 行链接与稳定 ID

给围栏 `id`，再打开 `anchorLineNos=true`，行号变成锚点链接，锚点为 `#<id>-<行号>`。

````markdown
```sql {id="ex-explain" title="explain.sql" lineNos="table" anchorLineNos=true}
EXPLAIN (ANALYZE, BUFFERS)
SELECT relname, n_live_tup FROM pg_stat_user_tables WHERE n_live_tup > 1000;
```

跳到 [第 4 行](#ex-explain-4)。
````

不写 `id` 时主题生成页面内唯一 ID，但依赖围栏顺序，不持久；只有作者书写的 `id` 才是永久链接。

### OINK 自有属性（信息行 `{…}`）

| 参数 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `title` | 非空字符串 | 无 | 可见标题栏（通常是文件名），同时是无障碍名称 |
| `filename` | 非空字符串 | 无 | `title` 的历史别名；两者同时出现时告警并使用 `filename` |
| `copy` | `all` `command` `true` `false` | 会话 lexer 为 `command`，其余为 `all` | `true` 等价于 `all`；`command` 只允许 `console`/`shell-session` |
| `wrap` | 布尔 | `false` | 视觉换行，不改源码；与表格行号互斥 |
| `collapse` | 正整数 | 无 | 初始显示的最大行数；行数不足时不生效 |
| `label` | 非空字符串 | 由标题派生 | 无障碍名称，不显示在页面上；与 `aria-label` 互斥 |
| `id` | 非空 token | 自动生成 | 稳定的块 ID 与行锚点前缀；不能含空白 |
| `tab` | 非空字符串 | 无 | 标签名；与 `num` 互斥 |
| `group` | `^[a-z][a-z0-9_-]*$` | 无 | 写在一组的第一个围栏上，启用 hash / 同步 / 持久化；需要 `tab` |
| `value` | `^[a-z0-9][a-z0-9_-]*$` | 无 | 分组内每个围栏必填，无分组时禁止；需要 `tab` |
| `num` | `[0-9A-Za-z.-]+` | 无 | 编号示例（Book `eg`）；必须与 `caption` 同时出现 |
| `caption` | 纯文本 | 无 | 编号示例的说明；必须与 `num` 同时出现 |
| `class` | class 列表 | 无 | 追加到 `.td-code` 根元素 |
| `data-*` / `aria-*` / `role` | 字符串 | 无 | 透传到根元素 |

### Chroma 选项（同一信息行，原样转交 Hugo）

| 选项 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `lineNos` | `false` `inline` `table` | `false` | 行号形态；`table` 与 `wrap=true` 互斥 |
| `lineNoStart` | 正整数 | `1` | 显示的起始行号，不影响 `hl_lines` 的计数 |
| `hl_lines` | 行号与区间 | 无 | 如 `"2 4-5"`，按围栏内源码行计数（从 1 起） |
| `anchorLineNos` | 布尔 | `false` | 行号变成锚点链接，前缀取自块的 `id` |
| `tabWidth` | 正整数 | Hugo 默认 | 制表符展开的空格数 |

### 坑与告警

- `title`、`filename`、`label` 已为块生成无障碍名称与 `role="group"`；与 `aria-label`、`aria-labelledby`、`role` 同写时告警并忽略冲突属性。
- `copy="command"` 只认会话 lexer，写在别的语言上是构建错误；会话块里一行提示符都没有时，复制按钮报失败，不退化成复制全文。
- 未知、不安全与保留属性在普通预览中告警并忽略；严格发布构建拒绝每条警告。
- 文档里展示 shortcode：围栏不阻止 Hugo 解析。要原样显示，在两侧定界符内侧各加一对注释符号：`{{</* tabs */>}}`、`{{%/* steps */%}}`。
- 围栏套围栏：外层用四个反引号、内层三个，内层还有时外层再加一个。列表项里的围栏缩进要与内容列对齐（`1.` 之后恒定三个空格）。
- `mermaid`、`math`、`chem`、`markmap`、`plantuml`、`echarts`、`infographic`、`checksums`、`filetree`、`gallery` 不是代码块：各有渲染钩子，不套这层外壳，也没有复制按钮。

---

## tabs 标签页

给相邻的围栏或表格加 `{tab=}` 属性得到标签页；加 group 后可分享链接、跨组同步、记住选择。正文（多段、列表、提示块）做标签页时才用 `tabs`/`tab` shortcode。

最短可用语法（连着写两个带 `tab` 的围栏，中间只隔空行）：

````markdown
```bash {tab="Homebrew"}
brew install hugo
```
```bash {tab="Debian / Ubuntu"}
sudo apt install hugo
```
````

服务器输出两个带标题的代码块；页面加载后运行时把相邻同类块重组为标签页。GitHub 上、打印时、关闭 JS 时看到连续两块完整内容。

### 分组：链接、同步与记忆

只在第一个块上写 `group`，这一组就有公开 URL hash `#<group>-<value>`、页内同步与浏览器持久化；分组内每个块都要写 `value`。

````markdown
```bash {tab="npm" group="pkgmgr" value="npm"}
npm create hugo-site@latest
```
```bash {tab="pnpm" value="pnpm"}
pnpm create hugo-site
```
````

- `value` 是机器值（`^[a-z0-9][a-z0-9_-]*$`），`tab` 是给人看的标签名，两者互不相干。
- 存储键 `td-tabs:v1:<group>`，全站同名 `group` 共享。初始选中优先级：URL hash → 存储值 → shortcode 的 `default` 或第一个块 → 第一个标签；带 hash 访问只切换不覆盖已存偏好。
- 同组联动时缺哪个值就保持不动，不会出现「一组没有选中项」。
- 面板 ID 在分组里是 `<group>-<value>`；同页第二组同名 `group` 的 ID 加 `-2`、`-3` 后缀（深链目标始终是第一组）。
- 键盘左右方向键（感知 RTL）与 Home/End 移动并激活标签，焦点停留在标签上；点击/按键用 `replaceState` 更新 hash 并写存储。

### 变体

- **表格标签页**：同一套属性写在表格属性行上。**围栏与表格不会混成一组**，一组里只能全是围栏或全是表格。
- **标签名与文件名共存**：围栏的 `tab` 和 `title` 可一起写，标签名进标签栏，文件名标题栏留在面板里。
- **落单块**：要凑够两个相邻同类块才变成标签页，落单块保留标题。**断开规则**：中间隔了正文、中间有 HTML 注释（如 `<!-- prettier-ignore-end -->`）、后一个块自己写了 `group` —— 任一都会断开。
- **正文标签页**：
  ````markdown
  {{< tabs group="deploy" default="pages" label="部署方式" >}}
  {{< tab label="GitHub Pages" value="pages" >}}
  仓库自带 `.github/workflows/`，推到 `main` 就会构建并发布。
  {{< /tab >}}
  {{< tab label="Cloudflare Pages" value="cloudflare" >}}
  在 Cloudflare 控制台里连接仓库。
  {{< /tab >}}
  {{< /tabs >}}
  ````
  `default` 必须是某个子项的 `value`，且需要 `group`。没有 `group` 时不能写 `value`，主题自动生成 `tab1`、`tab2`，只在本地切换。

### 属性（围栏信息行或表格属性行）

| 参数 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `tab` | 非空字符串 | 无 | 可见标签名；单独出现时就是这个块的标题 |
| `group` | `^[a-z][a-z0-9_-]*$` | 无 | 写在一组的第一个块上，启用 hash、页内同步与持久化；需要 `tab` |
| `value` | `^[a-z0-9][a-z0-9_-]*$` | 无 | 分组内每个块必填，无分组时禁止；需要 `tab` |

### `tabs` shortcode

| 参数 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `group` | `^[a-z][a-z0-9_-]*$` | 无 | 启用 hash、同步与持久化 |
| `default` | 某个子项的 `value` | 第一个子项 | 初始选中的面板；需要 `group` |
| `label` | 纯文本 | 本地化的「选项卡」 | 标签栏的无障碍名称，不显示在页面上 |

### `tab` shortcode

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `label` | 纯文本 | 是 | 可见标签名 |
| `value` | `^[a-z0-9][a-z0-9_-]*$` | 有 `group` 时 | 无分组时禁止书写，自动生成 `tab1`、`tab2` 等值 |

### 坑与告警

- 无效分组与组合在 Hugo 构建中告警并安全回退（丢弃不可用的 `group`/`value`/`default`、忽略夹杂正文、保留后出现的重复项或不渲染空集合）；严格发布构建拒绝每条警告。
- 标签页不是折叠块；只想收起长输出用 `> [!DETAILS]`。
- 同名 `group` 全站共享，`group` 名要按含义取（不要 `tabs1`）。

---

## table 表格

普通 GFM 管道表格加一行属性，得到标题、兼容矩阵、参数表、编号表或标签页；宽表格自己横向滚动（Tab 可聚焦，方向键滚动）。

最短可用语法（不写属性行就是普通表）：

```markdown
| 组件 | 端口 | 用途 |
| --- | :---: | --- |
| PostgreSQL | 5432 | 数据库 |
| Pgbouncer | 6432 | 连接池 |
| Patroni | 8008 | 高可用编排 |
```

对齐方式来自分隔行，表头单元格是 `th scope="col"`。

### 形态

- **标题** `{caption="…"}`：加一个可见 `<caption>`，纯文本，不给表编号。
- **兼容矩阵** `{.matrix}`：第一列成为行表头（`th scope="row"`），滚动时表头行与第一列吸附不动，其余单元格居中（分隔行另有对齐时以分隔行为准）。✅/❌ 是作者写的字符，主题不解析。
  ```markdown
  | OS / PG | PG18 | PG17 |
  | --- | :---: | :---: |
  | EL 9 | ✅ | ✅ |
  | Debian 13 | ✅ | ❌ |
  {.matrix}
  ```
- **全宽** `{.full-width}`：越出正文栏宽，占满文章可用宽度，适合列多但每列都短的表。
- **参数表** `{.fields}`：把表格变成定义列表，见下节。
- **编号表** `num`（可选 `#id` 与 `caption`）：包进带本地化「表 N.」标签的 `<figure>`，注册为 Book 目标可被 `xref` 引用；编号由作者写，`id` 缺省 `tbl-<num>`。
- **标签页** `{tab="…"}`：连着的表格组成一组，规则与相邻围栏一致。

### 属性行参数（表格下一行）

| 参数 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `.full-width` | 标记 | 无 | 越出正文栏宽，占满文章画布 |
| `.matrix` | 标记 | 无 | 第一列作行表头，表头与首列吸附，其余单元格居中 |
| `.fields` | 标记 | 无 | 渲染成定义列表，见下节 |
| `caption` | 纯文本 | 无 | 可见表格标题；在 `.fields` 上是列表的标签 |
| `meta` | 角色列表 | 无 | 命名 `.fields` 中间列的语义，取值 `type` `required` `default` `-`；必须与 `.fields` 同用 |
| `#id` | 标识符 | 有 `num` 时为 `tbl-<num>` | `[A-Za-z][A-Za-z0-9_.:-]*`；写在 `<table>`（编号表则 `<figure>`）上 |
| `num` | 字符串 | 无 | `[0-9A-Za-z.-]+`；注册为 Book 表目标，标题前加「表 N.」 |
| `tab` / `group` / `value` | 见标签页 | 无 | 相邻表格组成标签页 |
| `class` | class 列表 | 无 | 站点 CSS 用，原样留在 `<table>` 上 |
| `data-*` / `aria-*` | 字符串 | 无 | 透传 |

### 坑与告警

- 互斥：`.fields` 不能和 `.matrix`、`.full-width`、`num` 一起用；`num` 与 `tab` 互斥；`group`/`value` 需要 `tab`；`meta` 需要 `.fields`。
- 属性行必须紧贴表格：中间空一行就变成正文里可见的花括号。
- `style`、`on*` 与其它键告警并忽略；严格发布构建拒绝。
- 没有合并单元格、排序、筛选；需要合并表头的复杂表请拆成两张表或改成矩阵。
- 单元格里放不下块内容：多段说明、列表、围栏用 `fields`/`field` shortcode。
- `.matrix` 的居中由 CSS 实现：分隔行写了对齐就以分隔行为准。

---

## fields 参数表

用普通表格加 `{.fields}` 记录配置项、命令参数与 API 字段：名称独占一行，类型/必填/默认值是小字，说明另起一行，每条自带锚点。两种写法：表格 + `{.fields}`（默认选它），以及 `fields`/`field` shortcode（说明需要多段/列表/代码块时）。

最短可用语法：

```markdown
| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `offline_search` | boolean | `false` | 构建本地搜索索引并启用命令面板 |
| `offline_search_max_results` | integer | `10` | 搜索结果条数上限 |
| `page_width` | string | `normal` | 正文栏宽度，可选 `narrow` `normal` `wide` |
{.fields}
```

第一列是名称，最后一列是说明，中间每一列都是元数据，标签就是表头文字。单元格接受行内 Markdown，空的中间单元格省略。每个条目获得 `field-<名称>` 锚点（重名按 `-2`、`-3` 顺延），只在 HTML 里生成。

### 语义列 `meta=`

`meta` 按顺序说明每个中间列的角色：`type`、`required`、`default`，或 `-`（保留表头当标签）。

```markdown
| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `baseURL` | string | 是 | | 站点地址，含子路径 |
| `defaultContentLanguage` | string | | `en` | 默认语言，决定无前缀路径属于哪种语言 |
{.fields meta="type required default"}
```

规则：`meta` 应为每个中间列写一个角色，个数等于总列数减二，写多写少时告警并忽略；`required` 列「非空即真」（写「是」「yes」「✔」都一样，渲染出不翻译的 `required` 芯片，留空不显示）；`type` 与 `default` 单元格若本身没有行内标记会自动套代码格式；三种语义芯片按 `type`、`required`、`default` 顺序显示，与列顺序无关，`-` 列按列顺序排在后面。

### shortcode 形态

````markdown
{{< fields label="pig 命令常用参数" >}}
{{< field name="--config" type="path" required=true >}}
配置文件路径。相对路径按当前工作目录解析。
{{< /field >}}
{{< field name="--log-level" type="string" default="info" >}}
日志级别，从低到高：

- `debug`：打印每一次远程调用
- `info`：默认值
{{< /field >}}
{{< /fields >}}
````

`required=true` 与 `default=false` 是布尔值不加引号；`default` 接受任何标量（`default=0`、`default=""` 都会如实显示）。每个 `field` 必须有非空正文，且必须是 `fields` 的直接子项。

### 表格属性行参数

| 参数 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `.fields` | 标记 | 无 | 必需；把表格渲染成参数表 |
| `meta` | 角色列表 | 无 | 空格分隔，取值 `type` `required` `default` `-`；个数等于中间列数；语义角色不可重复 |
| `caption` | 纯文本 | 无 | 可见标签，同时是列表的无障碍名称 |
| `id` | 标识符 | 无 | 外层容器的 ID |
| `class` | class 列表 | 无 | 透传给站点 CSS |
| `data-*` / `aria-*` | 字符串 | 无 | 透传 |

### `fields` shortcode

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `label` | 非空字符串 | 否 | 可见标签，作用同表格的 `caption` |
| `id` | 标识符 | 否 | 外层容器 ID；不能含空白、引号、`<`、`>`、`&` |
| `class` / `data-*` / `aria-*` | 字符串 | 否 | 与表格属性行同一套策略 |

### `field` shortcode

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `name` | 非空字符串 | 是 | 字段名 |
| `type` | 非空字符串 | 否 | 类型标签，如 `boolean` `string[]` `duration` |
| `required` | 布尔 | 否 | `true` 时显示不翻译的 `required` 芯片，默认 `false` |
| `default` | 标量 | 否 | 字符串/布尔/整数/浮点；`false`、`0`、`""` 都会显示 |

### 坑与告警

- 第一列必须非空且在同一张表内唯一：重名或空名时告警并跳过该行，严格发布构建拒绝。
- `.fields` 不能与 `.matrix`、`.full-width`、`num` 组合；`meta` 不能用在没有 `.fields` 的表上。
- `required` 与 `default` 是不翻译的 API 词汇，所有语言下都显示英文。
- 暂不支持 `kind`、`since`、`deprecated`、`location`、字段级链接与嵌套结构。
- 两种形态选择：说明一句话能放进单元格用表格 + `{.fields}`；要分段/列表/代码块用 shortcode；要按同一批列横向比较多行用普通表格。

---

## steps 步骤

有序列表加 `{.steps}` 就是带编号圆点与竖线的操作步骤；步骤要带标题、要进目录时改用 `{{% steps %}}`。编号圆点与竖线由 CSS 绘制，不加载脚本。

最短可用语法（每项都写 `1.`，让 Markdown 自己数，内容缩进恒为三个空格）：

```markdown
1. 安装 Hugo Extended
1. 克隆 OINK Starter
1. 启动本地预览
{.steps}
```

`{.steps}` 必须紧贴列表最后一行，中间空一行它就会变成正文里可见的花括号。

- **步骤内容**：列表项里可放任何块级内容（段落、代码围栏、提示块、表格、嵌套列表、图片），缩进对齐到内容列（三个空格）。`{{< … >}}` 形式的 shortcode 可写在列表项里，`{{% … %}}` 不行。
- **按平台分开**：把带 `{tab=}` 的围栏并排写进某个列表项，照样合成标签页。
- **接着上一组编号**：正文隔断一组时，把新一组第一项写成实际序号，Markdown 输出 `start`，编号从那里继续（支持到 40）。
  ```markdown
  4. 配置 `baseURL` 与部署工作流。
  1. 推送到 `main`，等待 GitHub Actions 构建完成。
  {.steps}
  ```
- **带标题的步骤** `{{% steps %}}`（主题里唯一的百分号 shortcode）：正文是页面级 Markdown，每一个直接子标题（`##`–`######`）就是一步，正文不用缩进；标题因此能进右侧目录，里面也能放 `tabs`、`cards`、`fields` 等容器。
  ```markdown
  {{% steps %}}

  ### 安装工具链 {#install-toolchain}

  需要 Hugo Extended ≥ 0.160.1 与 Go。

  ### 启动服务器 {#run-server}

  推送到 `main`，仓库自带的工作流会构建并发布。

  {{% /steps %}}
  ```

### 写法约定（两种形态都无参数）

| 写法 | 位置 | 说明 |
| --- | --- | --- |
| `{.steps}` | 有序列表下一行 | 必需；写在无序列表上不生效 |
| `1.` | 每一项 | 让 Markdown 自己数；内容缩进恒为三个空格 |
| `4.`（首项） | 第一项 | 输出 `<ol start="4">`，编号从 4 接着走，支持 2–40 |
| `{{% steps %}}` | 包住若干标题 | 直接子标题（`##`–`######`）就是步骤；正文不缩进 |

### 坑与告警

- 列表项里不能写 `{{% … %}}`（多行输出会截断列表）；`{{% steps %}}` 不能放进列表项，也不能套在另一个百分号容器里；同一组步骤标题保持同一层级。
- 标记要紧贴列表，格式化工具场景用 `<!-- prettier-ignore-start -->` / `<!-- prettier-ignore-end -->`。
- `{.steps}` 只对有序列表有效。步骤不折叠、不记进度，没有「已完成」状态。
- 选择：一两句话加一段命令用有序列表 + `{.steps}`；每步要标题/被链接/进目录、或要放容器 shortcode 用 `{{% steps %}}`；步骤要嵌在别的列表项里只能用 `{.steps}`。

---

## cards 卡片

用带 `{.cards}` 的链接列表排出导航卡片网格；需要图标、徽章、图片时改用 shortcode。

最短可用语法（链接是标题，` — ` 之后是描述）：

```markdown
- [快速上手](/zh/docs/start/) — 克隆这个文档站，删掉不需要的页面，替换为你的站点信息。
- [创作内容](/zh/docs/write/) — 页面怎么组织、front matter 有哪些键。
- [定制站点](/zh/docs/customize/) — 导航、搜索、品牌、多语言。
{.cards}
```

- 整张卡片是点击热区；没有 `columns` 参数，列数由容器宽度决定，窄屏收成一列。
- 描述可省略（一行一个链接）。一句话装不下时用**松散列表**：链接单独一段、描述另起一段、列表项之间空一行；`{.cards}` 仍紧贴最后一段，中间不能有空行。
- `{.cards}` 只认无序列表，且必须紧贴列表（中间空一行或缩进进列表项，标记被静默丢弃，列表仍是列表）。

### shortcode 形态（图标、徽章、图片、多段）

```markdown
{{< cards >}}
{{< card title="快速上手" link="/zh/docs/start/" icon="fa-solid fa-rocket" badge="从这里开始" >}}
使用 OINK Starter，在定制前建立本地预览基线。
{{< /card >}}
{{< card title="键盘导航" link="/zh/docs/customize/keyboard/" icon="fa-solid fa-keyboard" >}}
全站快捷键与焦点顺序。
{{< /card >}}
{{< /cards >}}
```

- `icon` 是恰好一对 Font Awesome class；`badge` 是纯文本（固定在标题右侧）。
- `card` 正文按页面级 Markdown 渲染；`title`、`badge` 等参数是纯文本。不写 `link` 的卡片渲染成加粗标题，不生成链接。
- `image` 解析顺序与 `![alt](src)` 一致：页面资源 → 全局资源 `assets/` → 静态路径 `/images/…` → 远程 URL。需要替代文字来源：`image_alt="…"` 或 `decorative=true`，两个都写时告警并保留 alt，都不写时告警并按装饰图渲染。卡片图片不参与图片缩放。
- **栏目首页自动卡片**：主题读子页的 `title`、`description`、`icon` 自动生成。全局启用 `params.ui.section_index: cards`（或 `list`），单栏目在 front matter 覆盖或用 `cascade` 推给子树；自动卡片列数用 `params.ui.section_index_columns` 指定。栏目首页不要手写子页清单。

### 原生形态

| 元素 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `{.cards}` | 列表属性行 | — | 写在无序列表**之后**的一行；只对无序列表生效 |
| 列表项首个链接 | Markdown 链接 | — | 卡片标题，同时是整张卡片的点击目标 |
| 其余内容 | Markdown | — | 描述。紧凑列表里跟在 ` — ` 后面，松散列表里另起一段 |

### `card` 参数（`cards` 自身不接受任何参数）

| 参数 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `title` | 纯文本 | — | 必填，非空。卡片标题 |
| `link` | URL | — | 站内路径、相对路径、`http(s):`、`mailto:`；外链自动加 `rel="noopener"` |
| `icon` | Font Awesome class 对 | — | 例如 `fa-solid fa-rocket`；格式不符时告警并丢弃 |
| `badge` | 纯文本 | — | 标题右侧的小标签 |
| `image` | 图片来源 | — | 页面资源 / 全局资源 / 静态路径 / 远程 URL |
| `image_alt` | 纯文本 | — | 有 `image` 时与 `decorative` 二选一 |
| `decorative` | 布尔 | `false` | `true` 表示装饰图，输出空 alt |
| 正文 | Markdown | — | 卡片描述 |

### 坑与告警

- 没有 `cols`、`columns`、`accent`、`desc`、`color` 参数；未知参数在普通预览中告警并忽略，严格发布构建拒绝。
- `card` 只能待在 `cards` 里：单独使用或放进别的 shortcode 时告警并跳过。图标不是有效 Font Awesome class 对时告警并丢弃图标。
- 卡片不放长文：描述超过两行时改用正文段落或提示块。

---

## filetree 文件树

用 `filetree` 围栏画带注释的目录结构：对齐的注释列、逐条目图标、可折叠目录、可拖动的分栏。

最短可用语法（缩进表示层级，结尾 `/` 表示目录，`#` 之后是注释）：

````markdown
```filetree
- content/
  - _index.zh.md
  - docs/
  - blog/
- hugo.yml
- go.mod
```
````

项目符号（`-`、`*`、`+`）可省略；有子项的条目是目录，没有子项时结尾的 `/` 告诉主题它是目录。

- **注释**：每行第一个前面带空白的 `#` 之后是注释，渲染成对齐的右列（起点在构建期由最宽一行决定）；纯文本，要字面井号写 `\#`。注释列最多占面板右半边、最少占三成。中间虚线分隔条可拖动，也可 `Tab` 聚焦后按方向键调整（`Home`/`End` 到两端）；**只有带注释的树才加载它**（唯一的 JavaScript）。
- **缩进与层级**：两个空格、四个空格、制表符（按四列）都行，同一棵树内不要求统一，条件是每次退回的层级此前已打开过。`tree` 命令输出可整段粘贴，开头根目录行与结尾统计行（`3 directories, 5 files`）会被处理/丢弃。退回未打开过的层级时告警并跳过该行，消息带围栏内行号。
- **折叠与显式类型**：有子项的目录默认展开，`{open=false}` 初始收起（原生 `<details>`，`open` 只能写在目录上）。没有子项、名字也不以 `/` 结尾的条目按文件处理，`{type=dir}` / `{type=file}` 覆盖判断。
- **图标与配色**：图标默认按名字推断——目录用文件夹图标（随开合切换）；文件先按完整文件名匹配（`LICENSE`、`Makefile`、`go.mod`、`package.json`、`.gitignore` 等），再按扩展名匹配（`md yml toml json sh py go js sql css png svg pdf zip` 等），都不匹配时用普通文件图标。`{icon=…}` 覆盖它（一对 Font Awesome class），`{tone=…}` 给图标上色。
- **条目链接**：`[名字](链接)`，站内路径、相对路径、`http(s):` 都可以。
- **标签页**：围栏带 `tab=`（以及 `group=` `value=`）时成为一组标签页中的一页，可与代码围栏混排。

### 围栏属性

| 属性 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `title` | 纯文本 | — | 树上方的标题栏；不写就不画；不能为空 |
| `tab` | 纯文本 | — | 让这棵树成为一个标签页 |
| `group` / `value` | 字符串 | — | 标签页分组与同步值；必须与 `tab` 同时出现 |
| `class` | class 列表 | — | 透传给站点 CSS |

### 条目属性（写在每行末尾的 `{…}` 里）

| 属性 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `icon` | Font Awesome class 对 | 按名字 / 扩展名匹配 | 例如 `fa-solid fa-lock`；格式不符时告警并使用默认图标 |
| `tone` | 枚举 | `neutral` | `neutral` `info` `success` `warning` `danger`，只给图标上色 |
| `open` | 布尔 | `true` | 仅目录；`false` 表示初始收起 |
| `type` | 枚举 | 自动判断 | `dir` 或 `file`，覆盖自动判断 |

### 行语法

| 元素 | 说明 |
| --- | --- |
| 缩进 | 两个空格 / 四个空格 / 制表符 / `tree` 的 `│ ├── └──` 连线都行 |
| `- name` | 项目符号可省略；`-` `*` `+` 等价 |
| `name/` | 结尾斜杠表示目录；名字原样渲染，斜杠保留 |
| `[name](url)` | 带链接的条目 |
| `# 注释` | 第一个前面带空白的 `#` 之后的内容；`\#` 是字面井号 |
| `N directories, M files` | `tree` 的统计行，自动丢弃 |

### 坑与告警

- 只有 `filetree` 围栏这一种形态：没有 `{.filetree}` 列表标记，也没有 shortcode。
- 注释与名字都是纯文本（写 `**粗体**` 会原样显示）；不读取磁盘；不提供搜索、多选、复制整棵树；分栏宽度不持久化。
- 未知属性、未知取值、写在文件上的 `open`、格式错误的 `{…}`、退回未打开过的缩进层级，都会告警并安全回退或跳过坏行，消息给出围栏内行号；严格发布构建拒绝。
- 窄屏（小于 `sm` 断点）布局收成单列：注释移到名称下方、不再截断，分隔条隐藏。

---

## badge 徽章

在功能名、版本号或表格单元格旁边放一枚语义状态标签，五种 tone，不需要自定义颜色。徽章是行内元素，只有 shortcode 一种形态。

最短可用语法：

```markdown
{{< badge text="Beta" tone="warning" >}}
```

`text` 是唯一必填参数，必须是非空字符串。不写 `tone` 时使用 `neutral`；其它取值在普通预览中告警并使用 `neutral`，警告带源码位置，严格发布构建会失败。

- **常见位置**：夹在句子里（行内，不占单独一行）、表格单元格里、`{.steps}` 列表项里、卡片正文里。
- **标题旁边**：**标题里不要写 shortcode**——Hugo 先生成目录、后替换 shortcode，徽章在标题上渲染正常但目录里会留下内部占位符文本。把状态写进标题下面的第一段。
- **可点击**：加 `link` 后徽章变成 `<a>`；链接非法时普通预览告警并丢弃链接，保留普通徽章。
- **卡片**的 `badge` 参数是纯文本，固定在标题右侧；卡片正文里可放徽章 shortcode。

### 参数

| 参数 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `text` | 纯文本 | — | 必填，非空。读者看到的文字 |
| `tone` | 枚举 | `neutral` | `neutral` `info` `success` `warning` `danger` |
| `link` | URL | — | 设置后徽章变成链接 |

### 坑与告警

- 只接受命名参数。没有 `icon`、`class`、`color`、`outline`、`size` 参数。未知参数忽略，空 `text` 不渲染，非法 `tone` 回退 `neutral`，不安全链接被丢弃；严格发布构建拒绝每条此类警告。
- 颜色不是唯一含义载体：文字要自己说清楚（`{{< badge text="🔴" >}}` 对读屏器没有信息）。
- 文字要短；同一处不超过三枚。徽章不是实时状态区域，新增徽章不触发读屏器播报。

---

## kbd 按键

用 `kbd` 写快捷键：一个 shortcode 接一串按键名，输出语义化的按键序列。适用于快捷键与组合键；命令名、选项名与要输入的文本用行内代码。

最短可用语法：

```markdown
按 {{< kbd "Ctrl" "K" >}} 打开命令面板。
```

参数必须加引号，一个按键一个位置参数。缺少、空白或命名参数会告警，普通预览不渲染无效按键；严格发布构建拒绝。

- **组合键**：多个参数按顺序渲染，中间补 `+`（该加号对辅助技术隐藏，读屏器读到本地化连接词）。按字面的加号把它当成独立按键：`{{< kbd "Ctrl" "+" >}}`。
- **平台差异**：按键名写读者键盘上印的标签：macOS 写 `⌘`，Windows / Linux 写 `Ctrl`。不要把两个平台合进同一个序列（`Ctrl/⌘` 读屏器无法正确朗读）；在句子里说明平台或分成标签页。
- **快捷键表**是按键最常见位置，见下。
- **原始 `<kbd>` 标签**得到同样样式（GitHub 也这么渲染），但分隔符与无障碍序列要自己维护；单个键两种写法都可，组合键用 shortcode。

```markdown
| 按键 | 作用 |
| --- | --- |
| {{< kbd "Ctrl" "K" >}} | 打开命令面板（macOS 是 {{< kbd "⌘" "K" >}}） |
| {{< kbd "/" >}} | 面板的完整搜索态 |
```

### 参数

| 参数 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| 位置参数 1..n | 字符串 | — | 至少一个，每个都必须非空且加引号；顺序就是显示顺序 |

### 坑与告警

- 只接受位置参数。没有 `separator`、`label`、`platform`、`class`、`size` 这些命名参数：Hugo 不允许一次调用里混用位置参数与命名参数。
- 一个序列表示同时按下的一组键：先按 A 再按 B 这类连续操作写成两个 kbd 加一句说明。
- 不做平台检测、不做按键映射与录制。漏写引号会让构建失败：`{{< kbd Ctrl K >}}` 里的 `Ctrl` 不是字符串参数。
- 不用它标命令：`hugo server` 写成行内代码，`Ctrl` 是按键。
