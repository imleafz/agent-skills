# 配置、目录与设置

来源：<https://mise.jdx.dev/configuration>、`configuration/environments`、`configuration/vars`、`configuration/settings`、`directories`

## `mise.toml` 可放的位置（同目录内，越靠上优先级越高）

- `mise.local.toml`（本地，不入库）
- `mise.toml`
- `mise/config.toml`
- `mise/conf.d/*.toml`（按字母序加载）
- `.mise/config.toml`
- `.mise/conf.d/*.toml`
- `.config/mise.toml`
- `.config/mise/config.toml`
- `.config/mise/conf.d/*.toml`

以 `mise` 开头的路径可以是 dotfile（`.mise.toml`、`.mise/config.toml`）。用 `mise config` 查看实际加载顺序。

顶层小节：`[tools]` `[tool_config]` `[env]` `[vars]` `[tasks.*]` `[settings]` `[plugins]` `[tool_alias]` `[shell_alias]` `[hooks]` `[dotfiles]` `[bootstrap.*]` `[deps.*]` `[daemons]` `[wrappers]` `include` `min_version` `monorepo_root`。

## 合并规则（分层）

mise 会从当前目录向上到根（或 `MISE_CEILING_PATHS`）逐级读取，子目录覆盖父目录。各小节合并方式不同：

| 小节 | 合并方式 |
| --- | --- |
| `[tools]` | 增量 + 覆盖 |
| `[env]` | 增量 + 覆盖 |
| `[settings]` | 增量 + 覆盖 |
| `[tasks]` | 同名任务后定义者完全替换（metadata-only 定义可只覆盖元数据） |
| `[tool_config]` | 仅作用于同一 config root 的工具 |

注意：环境特定文件（如 `mise.test.toml`）不会因为"是环境文件"就覆盖普通子目录文件——环境选择属于*文件发现*阶段，不是层级末尾的强制覆盖。

写入目标规则（`mise use`/`set`/`unset`）：写"最高优先级目录中最不优先级的文件"。即 `mise.toml` 与 `mise.local.toml` 同时存在时写 `mise.toml`；`--env local` 写 `mise.local.toml`。`mise config get/set` 默认写最高优先级的已加载 TOML（可能是 `mise.local.toml`）。

## conf.d 文件夹片段

`conf.d` 下每个子文件夹是一个 fragment，其配置与所用文件放在一起；文件夹即其配置的 config root：

```text
~/.config/mise/conf.d/
├── git.toml
└── git-tools/
    ├── mise.toml             # 总是加载
    ├── mise.local.toml
    ├── mise.linux.toml       # 仅 linux 环境
    └── gitconfig
```

只读取 `mise.toml`、`mise.local.toml`、`mise.<env>.toml`、`mise.<env>.local.toml`；文件夹不递归，`.` 开头忽略。fragment 里相对路径（如 dotfile 源 `gitconfig`）在该文件夹内解析，`{{ config_root }}` 为文件夹路径，任务默认在该文件夹运行。

## `include`：引入远程配置（组织基线）

```toml
include = [
  "git::https://github.com/myorg/platform.git//mise.toml?ref=main",
  "oci::ghcr.io/myorg/platform-config@sha256:0f1e2d3c...",
]

[tools]
node = "22"   # 本文件自身的条目覆盖 include 的
```

- 只能含 `[tools]` `[tool_alias]` `[env]` `[vars]` `[hooks]` `[alias]` `[shell_alias]` `[plugins]` `[wrappers]` 与 `min_version`；不能嵌套 `include`，不能含 `[settings]`/monorepo/`[tasks]`/系统小节。
- 信任随包含它的文件；paranoid 模式要求 include 用完整 commit sha 或 OCI digest。
- 结果缓存于 `MISE_CACHE_DIR`；`mise cache clear` 强制重取。

## Config Environments（环境特定配置）

选择方式：`mise -E production ...`、`MISE_ENV=production`、或 `.miserc.toml` 里 `env = ["production"]`。多个：`mise -E ci,test run build`（同目录内后者优先）。

```toml
# mise.production.toml
[env]
APP_MODE = "production"
```

- 全局：`config.<env>.toml`；项目：`mise.<env>.toml`；local 变体：`mise.<env>.local.toml`（优先级最高）。
- 个人选择放 `.miserc.local.toml`（`env = [...]`），全局机级选择放 `~/.config/mise/miserc.local.toml`。
- `.miserc.toml` 支持 Tera 模板但只有 OS 级上下文（`env`、`cwd`、`arch()`、`os()`、XDG 路径等）；不能引用 settings。
- 环境相关的锁文件：`mise.test.toml` → `mise.test.lock`（严格作用域，只含该配置定义的工具）。
- **平台环境**（`auto_env`，当前默认关闭，2027.6.0 起默认开）：自动激活 `{os_family}` (`unix`)、`{os}` (`linux`/`macos`/`windows`)、`{os}-{arch}`（如 `macos-arm64`），从而自动加载 `mise.windows.toml` 等。优先级：`unix` < `{os}` < `{os}-{arch}` < 显式 `MISE_ENV`。
- **conf.d 环境**（`env_conf_d`，迁移中）：文件名点号后缀选环境，如 `tools.development.toml`；默认仍全部无条件加载，需显式开启。

## `[vars]`：配置内可复用变量（不导出到子进程）

用于 Tera 模板中 `{{ vars.NAME }}`。与 `[env]` 区别：vars 不导出为环境变量。

```toml
[vars]
node_version = "24"
test_mode = "headless"

[tools]
node = "{{ vars.node_version }}"

[tasks.test]
run = "echo {{ vars.test_mode | quote }}"
```

- 顶层 vars 在加载配置时解析（引用先解析的值），值是字符串，之后引用不再重新求值。
- 任务内 `vars = { ... }` 覆盖仅对该任务渲染时生效。
- 支持与 `[env]` 相同的 value 指令：`default`、`required`、`redact`、`_.file`/`source`/secrets 等。

## Idiomatic version files（其它工具链的版本文件）

默认关闭。启用：

```sh
mise settings add idiomatic_version_file_enable_tools python
mise settings add idiomatic_version_file_disable_files node:package.json
```

常见：node → `.nvmrc`/`.node-version`/`package.json`；python → `.python-version`；ruby → `.ruby-version`/`Gemfile`；go → `.go-version`/`go.mod`(`toolchain`)/`go.work`；rust → `rust-toolchain.toml`；terraform → `.terraform-version`；java → `.java-version`/`.sdkmanrc`；dotnet → `global.json` 等。mise 只读取"项目构建所用版本"字段，不读"最低兼容版本"字段（`go.mod` 的 `go X.Y` 与 `CMakeLists.txt` 的 `cmake_minimum_required` 是弃用的例外，会告警并移除）。

`.tool-versions` 直接支持（asdf 格式），含 `ref:`、`prefix:`、`path:`、`sub-2:lts` 等 scope。mise.toml 支持相同 scope：

- `ref:<SHA>` 从 vcs ref 编译
- `prefix:<PREFIX>` 取匹配前缀的最新版（如 `prefix:1.20`）
- `path:<PATH>` 使用自定义路径的版本（如 Homebrew 的 `path:/opt/homebrew/opt/node@20`）
- `sub-<X>:<ORIG>` 版本数值相减（如 `sub-2:lts`）

## `[settings]`：控制 mise 自身行为

```sh
mise settings set jobs 4            # 默认写全局
mise settings set --local jobs 2    # 写项目
mise settings ls --all              # 查看生效设置（含默认）
mise settings ls --json-extended    # 带来源信息
```

等价 TOML：`[settings] jobs = 4`。部分设置控制*配置发现*，必须在 `.miserc.toml` 或环境变量中设置（放进 `[settings]` 太晚），文档会单独标注。完整设置列表见 <https://mise.jdx.dev/configuration/settings.html>。

## 目录结构（默认，均可由 `MISE_*`/`XDG_*` 覆盖）

| 用途 | Linux | macOS | Windows | 覆盖 |
| --- | --- | --- | --- | --- |
| 全局配置 | `~/.config/mise` | 同左 | `%USERPROFILE%\.config\mise` | `MISE_CONFIG_DIR` |
| 缓存 | `~/.cache/mise` | `~/Library/Caches/mise` | `%TEMP%\mise` | `MISE_CACHE_DIR` |
| 本地状态 | `~/.local/state/mise` | 同左 | `%USERPROFILE%\.local\state\mise` | `MISE_STATE_DIR` |
| 已装工具/插件 | `~/.local/share/mise` | 同左 | `%LOCALAPPDATA%\mise` | `MISE_DATA_DIR` |

- `~/.local/share/mise/installs/<tool>/<version>` 为安装目录（`MISE_INSTALLS_DIR` 可覆盖；不要在 `[env]` 里设，因为它在 mise 启动时读取）。
- 状态目录存信任记录、加密的 env cache。cache 目录可安全清理；别把它指向配置/安装目录。
- 系统安装：`/usr/local/share/mise/installs`、`.../shims`（`system_installs_dir`/`system_shims_dir`）。`mise install --system` 与 `mise reshim --system`；mise 不会自动提权。

## 关键环境变量（非 settings）

| 变量 | 作用 |
| --- | --- |
| `MISE_DATA_DIR` / `MISE_CACHE_DIR` / `MISE_STATE_DIR` / `MISE_CONFIG_DIR` | 目录覆盖 |
| `MISE_GLOBAL_CONFIG_FILE` | 全局配置文件路径 |
| `MISE_DEFAULT_CONFIG_FILENAME` | 本地默认配置文件名（默认 `mise.toml`） |
| `MISE_ENV` | 选择 config environment |
| `MISE_ENV_FILE=.env` | 从 dotenv 加载环境变量（当前目录及父目录） |
| `MISE_${TOOL}_VERSION` | 覆盖某工具版本，如 `MISE_NODE_VERSION=20` |
| `MISE_TRUSTED_CONFIG_PATHS` | 自动信任的路径列表 |
| `MISE_CEILING_PATHS` | 配置搜索停止的上界路径 |
| `MISE_LOG_LEVEL` / `MISE_DEBUG=1` / `MISE_TRACE=1` / `MISE_QUIET=1` | 日志 |
| `MISE_RAW=1` | 插件脚本直连 stdin/stdout（并设 `MISE_JOBS=1`） |
| `MISE_TERM_WIDTH` | 覆盖表格宽度（CI 里有用） |
| `MISE_PARANOID=1` / `MISE_SAFE=1` | paranoid / safe 模式 |
| `MISE_EXPERIMENTAL=1` | 开启实验特性 |

## `[_]` 小节

`[_]` 下的键 mise 永不解析，可放任意元数据（如注释字段）。
