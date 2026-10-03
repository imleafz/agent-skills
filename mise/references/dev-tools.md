# 开发工具、后端与锁定

来源：<https://mise.jdx.dev/dev-tools>、`dev-tools/backends/`、`registry`、`dev-tools/aliases`、`dev-tools/mise-lock`、`dev-tools/deps`、`dev-tools/tool-stubs`、`dev-tools/mise-oci`

## 声明工具

```toml
[tools]
node = "24"
python = "3.13"
ripgrep = "latest"
"npm:prettier" = "3"                       # 显式 backend
"github:BurntSushi/ripgrep" = "latest"
```

- `mise use node@24`：安装并写配置；`mise install`：只安装已声明的；`mise exec node@24 -- node -v`：临时试运行。
- 版本请求 `"24"` 选 24 系列最新；精确固定写完整版本。锁定解析结果见 `mise.lock`。

### 工具选项（tool options）

```toml
[tools]
node = { version = "22", postinstall = "corepack enable" }
python = { version = "3.14", install_env = { CONFIGURE_OPTS = "--enable-optimizations" } }
ripgrep = { version = "latest", os = ["linux", "macos"] }
jq = { version = "latest", os = ["linux/x64"] }
"pipx:ruff" = { version = "latest", depends = ["python"] }
"github:owner/tool" = { version = "latest", version_order = "semver" }
```

| 选项 | 含义 |
| --- | --- |
| `version` | 版本请求 |
| `os` | 限制平台：`linux`/`macos`(`darwin`)/`windows`(`win`)/`unix`，可 `os/arch`（`macos/arm64`、`linux/x64`） |
| `depends` | 安装顺序依赖（不自动安装被依赖工具） |
| `install_env` | 下载/安装/工具级 postinstall 时的环境变量（可用模板，如 `{{ env.HOME }}`） |
| `postinstall` | 安装完成后运行的命令；`{ run = "...", when = "always" }` 让它在每次 `mise install` 都跑 |
| `version_order` | `source`（默认）或 `semver`（用于上游有 backport 的工具） |
| `lazy` / `lazy_bins` | 懒安装（见 getting-started） |
| `locked` | 工具级锁定策略 |

backend 特定选项要查对应 backend 文档；嵌套 TOML 只是组织方式，不会给 backend 增加能力。

## Backend（安装来源）

registry 短名（`ripgrep`）映射到默认 backend；无短名时用 `backend:spec`。先 `mise registry <name>` / `mise ls-remote <name>` / `mise tool <name>`（查看会用哪个 backend 及其校验）。

| 来源 | Backend | 注意 |
| --- | --- | --- |
| 签名发布清单 | `packslip` | Tier1；校验 signer 与摘要 |
| 精选二进制配方 | `aqua` | Tier2；registry 元数据、SLSA/Cosign/Minisign/attestation |
| 发布资产 | `github` / `gitlab` / `forgejo` | Tier2 |
| 直接下载 | `http` / `s3` | 需提供 URL 与版本来源 |
| 语言包 | `cargo` / `go` / `npm` / `pipx`/`pypi` / `gem` / `dotnet` / `spm` | 需对应运行时/工具链 |
| 二进制生态 | `conda` | 直接用 conda channel，无需 conda 可执行文件 |
| 插件式安装 | `vfox` / `asdf`(legacy) | 供应链风险；新 registry 条目不接受 |
| 旧式 | `ubi` | 已弃用 |

- 内置语言支持（core tools）：node、python、ruby、go 等。外部同名插件可覆盖行为（`mise plugins ls` 查看）。
- `mise settings set disable_backends asdf` 禁用某 backend。
- `MISE_BACKENDS_<TOOL>`（SHOUTY_SNAKE_CASE）可临时覆盖某工具 backend。
- 版本特定 backend：registry 可声明某 backend 从哪个版本起支持，mise 自动选择。

## `[tool_alias]`：后端别名与版本别名

```toml
[tool_alias]
node = "core:node"                 # 后端别名
dhall-json = "github:dhall-lang/dhall-haskell"

[tool_alias.node.versions]
project-lts = "24"                 # 版本别名；不是精确固定
```

`[alias]` 是旧名（弃用）。命令别名用 `[shell_alias]`。

## `mise.lock` 锁定文件

`mise.toml` 记"请求"，`mise.lock` 记"解析到的具体版本 + 制品 URL/校验和/验证元数据"。

```sh
mise lock                # 解析配置，不安装
mise install --locked    # 按锁文件安装；CI 用它捕捉缺失条目
mise lock --bump node    # 在请求范围内重解析到最新并更新锁文件
mise upgrade node        # 安装更新并更新锁文件
```

- 自动创建/维护：`[settings] lockfile = true`（未设置时 mise 只更新已存在的锁文件，不新建）。
- 严格模式：`mise settings set locked=true` 或 `MISE_LOCKED=1`，或 `[tool_config] locked = true`（仅该 config root）。`locked_scopes = ["project"|"global"|"system"]` 可放宽某些作用域。
- 环境锁文件：`mise.test.toml` → `mise.test.lock`；local 的 `mise.local.lock` 应 gitignore。全局工具用 `mise lock --global`。
- 平台条目 `[tools.node."platforms.macos-arm64"]` 含 `checksum`/`url`/`url_api`/`provenance` 等。v2 锁文件会用 sidecar 目录（`.mise/locks/...`）记录 npm(aube)/PyPI(uv) 的传递依赖图，需一并提交。
- `mise lock --sidecars` 列出 sidecar 目录。校验和不匹配时，只刷新受影响工具：`mise lock node`，比对 diff 再提交；不要删校验和绕过。
- `minimum_release_age`（默认 24h）配合锁文件降低供应链风险：模糊请求不会选太新的版本；锁文件选中的版本绕过该冷却期。
- 从 asdf 迁移：`mise generate config --tool-versions .tool-versions` → `mise lock` → `mise install`。

## `mise deps`（实验）：项目依赖安装器

用 `[tools]` 装包管理器本身，用 `[deps]` 装项目依赖。基于 blake3 源哈希判断新鲜度（状态存 `$MISE_STATE_DIR/deps/`，不写进项目）。

```toml
[settings]
experimental = true

[deps.npm]
auto = true            # 在 mise x / mise run 前自动检查

[deps.prisma]
depends = ["npm"]
sources = ["prisma/schema.prisma"]
outputs = ["node_modules/.prisma/"]
run = "npx --no-install prisma generate"
```

内置 provider：npm、yarn、pnpm、bun、deno、aube、go、pip、poetry、uv、bundler、composer、dart、flutter、git-submodule。`mise deps add npm:react` / `mise deps remove npm:lodash`。`mise deps install npm --explain` 查看判定，`--force` 强制，`mise run --no-deps` / `mise x --no-deps` 跳过自动检查。

## Tool stubs（可移植工具入口）

以 `#!/usr/bin/env -S mise tool-stub` 开头的可执行 TOML 文件，把工具定义嵌进脚本，提交到仓库：

```toml
#!/usr/bin/env -S mise tool-stub
tool = "python"
version = "3.14"
bin = "python"
```

首次执行时安装。HTTP stub 用顶层 `url` 或 `[platforms.<os-arch>].url`。字段：`tool`、`version`（默认 latest）、`bin`、`os`、`install_env`。机级普通工具目录优先用 `[tools]` 的 `lazy = true`。

## `mise oci`（实验）：把 mise.toml 变成容器镜像

`mise oci build/run/push`，每个工具一个 OCI layer，可独立复用。仅在**目标架构的 Linux 主机**上构建（打包本机已装二进制，不交叉编译）。默认 base `debian:bookworm-slim`；`--no-mise` 跳过 mise 二进制；`[oci.copy]` 可拷文件进镜像。命令：`mise oci build -o ./mise-oci`、`mise oci run --image-dir ./mise-oci -- node --version`、`mise oci push --image-dir ./mise-oci ghcr.io/OWNER/IMAGE:TAG`。

## GitHub token（避免 API 限流 / 访问私有）

安装报 GitHub 限流或 401/403 时配置 token。来源（按优先级）包括：`GITHUB_TOKEN`/`GH_TOKEN` 环境变量、`gh` CLI 的 `hosts.yml`、`~/.config/mise/github_tokens.toml`。详见 <https://mise.jdx.dev/dev-tools/github-tokens.html>。

## 系统级安装

`mise install --system uv`：以普通用户下载/校验/解包，需要时调用 `sudo` 放入系统目录（默认 `/usr/local/share/mise/installs`）。仅支持 aqua/github/gitlab/forgejo/http/s3，且不能有工具级 postinstall。`[settings.system_packages] sudo = false` 关闭自动提权。
