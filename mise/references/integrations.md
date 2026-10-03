# 集成：CI、IDE、MCP、Daemons、Docker

来源：<https://mise.jdx.dev/continuous-integration>、`ide-integration`、`mcp`、`daemons`、`mise-cookbook/docker`、`direnv`

## CI

原则：CI 与本地用同一份 `mise.toml`；用 `mise exec`/`mise run` 加载工具与环境；提交 `mise.lock` 并用 `mise install --locked` 复现。

### 通用脚本（提交 wrapper，避免每步安装）

```sh
set -eu
./bin/mise install              # 有锁文件用 ./bin/mise install --locked
./bin/mise exec -- npm ci
./bin/mise exec -- npm test
```

生成 wrapper（本地执行一次后提交 `bin/mise`，并把 `.mise/` 加进 `.gitignore`）：

```sh
mise generate install-script -l -w
```

runner 需要 `curl`、CA 证书、`tar`、`sha256sum` 或 `shasum`。

### GitHub Actions

```yaml
- uses: actions/checkout@v6
- uses: jdx/mise-action@v4
  with:
    install_args: --locked      # 有 mise.lock 时
- run: mise exec -- npm test
```

`mise-action` 默认也会缓存工具、把 shims 加入 PATH、导出 mise 环境变量。

### GitLab CI / 官方镜像

官方镜像 `ghcr.io/jdx/mise:<version>-debian` 已含 mise、curl、git、CA。让缓存可命中：

```yaml
image: ghcr.io/jdx/mise:2026.9.11-debian
variables:
  MISE_DATA_DIR: $CI_PROJECT_DIR/.mise
  MISE_CACHE_DIR: $CI_PROJECT_DIR/.mise/cache
cache:
  key:
    prefix: mise-amd64
    files: [mise.toml, mise.lock]
  paths: [.mise/installs/, .mise/cache/]
script:
  - mise install
  - mise exec -- npm ci
```

Xcode Cloud 用 `ci_scripts/ci_post_clone.sh` + 提交的 `bin/mise`。

### 处理不可信配置（safe mode）

```sh
MISE_SAFE=1 mise lock --bump --dry-run --json   # 去掉 --dry-run 以更新锁文件
```

## IDE / 编辑器集成

先明确*哪个进程*需要工具：编辑器终端、语言服务器、调试器、扩展宿主可能用不同环境。改版本后重启受影响的进程。

| 需求 | 方案 |
| --- | --- |
| 固定可执行文件/SDK 路径 | `mise which node` / `mise where java`，填入 IDE 设置 |
| 跟随当前项目 | shims（进程需在项目目录内运行；会加载 env 变量） |
| 带项目环境运行命令 | `mise exec -- <command>` |
| 跟随配置变化的编辑器特性 | 对应 mise 插件 |

把 shim 目录加入**登录 profile**（编辑器常读它）：

```zsh
# ~/.zprofile
eval "$(mise activate zsh --shims)"
```

社区插件：VSCode `mise-vscode`、JetBrains `intellij-mise`、Neovim `miser.nvim`、Emacs `mise.el`。

- VSCode 调试：`launch.json` 里 `"runtimeExecutable": "mise"`, `"runtimeArgs": ["exec","--","node"]`，`cwd` 设为含 `mise.toml` 的项目。
- macOS 上让任务/调试终端加载 `~/.zprofile`：`terminal.integrated.automationProfile.osx` 用 `["/bin/zsh","--login"]`。
- Xcode：`"$HOME/.local/bin/mise" --cd "$SRCROOT" exec -- swiftlint lint`；开启 User Script Sandboxing 时需声明输入输出（`mise.toml` 之外还可能需要数据目录）。
- 诊断：`mise which node` 与 `mise exec -- node --version`，再对照编辑器/LSP 日志里的可执行路径与工作目录。

## MCP（实验）

`MISE_EXPERIMENTAL=1 mise --cd /abs/project mcp` 提供 stdio MCP server，供 AI 助手查看工具/任务/环境/配置并运行任务。

```json
{
  "mcpServers": {
    "mise": {
      "command": "/abs/path/to/mise",
      "args": ["--cd", "/abs/path/to/project", "mcp"],
      "env": { "MISE_EXPERIMENTAL": "1" }
    }
  }
}
```

资源：`mise://tools[?include_inactive=true]`、`mise://tasks`、`mise://env`、`mise://config`。工具：`list_commands`、`run_task`（执行任务，设 `MISE_YES=1`、无交互 stdin）、`install_tool`（暂未实现）。

安全：连接只限可信项目；`mise://env` 会求值并返回可能含密钥的值；`run_task` 以你的账号权限执行项目命令。审查任务定义并用客户端的工具审批控制。

## Daemons（实验，需 pitchfork）

用于跨任务存活的长进程（数据库、消息代理、开发服务器）。声明在 `mise.toml`，mise 提供项目工具环境，pitchfork 管理进程与就绪检查。

```toml
[settings]
experimental = true

[daemons]
postgres = "18"

[tasks.dev]
daemons = "postgres"
run = "npm run dev"
```

运行 `mise run dev`：装工具 → 起 postgres → 等就绪 → 跑 `dev`。任务退出后 postgres 继续运行。

声明方式：`postgres = "18"`（预设）、`{ preset = "postgres", version = "18", port = 5433 }`、`{ run = "exec npm run dev", ready_port = 3000 }`、`{ task = "dev:core", args = [...] }`。长驻命令用 `exec` 以便直接接收停止信号。任务里 `daemons = ["postgres","redis"]` 或 `true`（本项目全部）。

```sh
mise daemons ls / status / start <name> / stop <name> / logs <name>
mise daemons restart <name>
```

`[daemons_settings] namespace`；`[daemon_groups]` 命名一组。可跨项目引用（`{ project = "../workers", name = "worker" }`）。跨 worktree 的稳定 URL/端口见官方文档。

## Docker

- 官方镜像：`ghcr.io/jdx/mise:<version>`（及 `-debian` 变体）。适合多阶段构建中固定工具集。
- 单机本地开发可用 `mise oci`（见 `dev-tools.md`）。
- CI 里缓存 `~/.local/share/mise/installs`（或本地化目录 `.mise/installs`），缓存 key 含 OS/架构与 `mise.toml`/`mise.lock`。

## direnv（已弃用，不推荐混用）

direnv 与 mise 都改环境，shell hook 可能对 PATH 增删有分歧，官方**不支持**二者混用。

| `.envrc` 行为 | mise 等价 |
| --- | --- |
| `export NODE_ENV=...` | `[env]` |
| 加载 dotenv | `env._.file` |
| `PATH_add bin` | `env._.path` |
| source bash 脚本 | `env._.source` |
| 激活 python venv | `_.python.venv` 或 `python.uv_venv_auto` |

迁移完成后移除项目 direnv 集成并激活 mise。
