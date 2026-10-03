---
name: mise
description: mise (mise-en-place) 开发工具版本与项目环境管理器。用于在 mise.toml 中声明工具版本 [tools]、环境变量 [env]、任务 [tasks]、变量 [vars]；管理 backend(安装来源)、mise.lock 锁定文件、shims、bootstrap 机器初始化(系统包/仓库/dotfiles/服务/macOS 默认值)、配置分层与 config environments(mise.<env>.toml)、registry 与插件、CI/IDE/MCP/daemons 集成，以及从 asdf/.tool-versions 迁移。当用户提到 mise、mise.toml、mise.lock、mise use/install/run/exec/upgrade/lock/settings/tasks、asdf 迁移、node/python 多版本切换、统一项目环境变量与任务、跨机器复现工具版本时使用。
allowed-tools: Read, Bash, Glob, Grep, Edit, Write, WebFetch
---

# mise (mise-en-place)

mise 用一个 `mise.toml` 统一管理开发工具版本、环境变量与任务。发音 "meez"。
官方文档：<https://mise.jdx.dev>；本技能内容对应 2026.x 系列文档。

> **自演进技能**：使用中发现指令有误、参数漂移或需要额外 workaround 时，请直接修正本技能文件（仅针对真实可复现的问题），不要拖延。

## 何时使用

触发场景：用户提到 mise / `mise.toml` / `mise.lock` / `.tool-versions`；需要固定或切换项目工具版本（node、python、ruby、go、terraform、jq…）；把环境变量、任务、dotfiles、系统包声明在同一份配置里；需要跨机器/CI 复现版本；从 asdf 迁移。

不适用：仅需一次性 `nvm`/`pyenv` 用法且用户明确不迁移；纯粹的应用依赖安装（那是包管理器的事 —— mise 管"工具/运行时"，应用依赖交给 npm/uv 等，`mise.lock` 只锁工具）。

## 核心模型（先建立心智模型）

- **Tool Request → Tool Version**：`node = "24"` 是"请求"，会被解析成具体版本 `24.x.y`；精确固定用 `node = "24.0.0"`，或交给 `mise.lock`。
- **Backend（后端）**：告诉 mise 从哪里取工具、怎么装。registry 短名（`node`、`ripgrep`）映射到默认 backend；也可显式写 `github:owner/repo`、`aqua:...`、`npm:...`、`cargo:...` 等。
- **Config Root**：相对路径、`{{ config_root }}` 都相对它解析；`mise.toml` 所在目录即 config root。
- **配置分层**：system(/etc/mise) < global(~/.config/mise) < 父目录 < 当前目录；同目录下 `mise.toml` < `mise.<env>.toml` < `mise.local.toml` < `mise.<env>.local.toml`。`[tools]` 与 `[env]` 是"增量+覆盖"，`[tasks]` 是同名覆盖。
- **三种加载项目环境的方式**：`mise activate`（交互 shell 推荐）、shims（编辑器/需要稳定可执行路径）、`mise exec`/`mise run`（脚本与 CI，显式加载，不依赖 shell 启动文件）。
- **`mise.toml` 记请求，`mise.lock` 记解析结果**；两者一起提交，CI 用 `mise install --locked`。
- **信任（trust）**：任务/钩子/`_.source` 等可执行代码的配置需 `mise trust`；非 CI 下 `mise install/exec/run` 会自动信任当前配置，paranoid 模式则强制显式信任。

## 快速参考

```bash
# 安装（macOS/Linux）
curl https://mise.run | sh          # 二进制装到 ~/.local/bin
# 激活（zsh；bash/fish/pwsh 见 references/getting-started.md）
echo 'eval "$(~/.local/bin/mise activate zsh)"' >> ~/.zshrc

# 日常命令
mise use node@24 python@3.13   # 安装并写入当前项目 mise.toml
mise use -g node@24            # 写入全局默认
mise install                   # 只安装配置里已声明的工具，不改声明
mise exec -- node --version    # 用项目环境跑一次性命令（别名 mise x）
mise run build                 # 运行任务（别名 mise r / mise build）
mise ls --current              # 查看当前生效的工具版本
mise config ls / mise config   # 查看实际加载了哪些配置文件
mise tasks ls                  # 列出任务
mise doctor                    # 自检
```

### 命令地图（常用）

| 目标 | 命令 |
| --- | --- |
| 加/改项目工具版本 | `mise use node@24` |
| 设个人默认 | `mise use -g node@24` |
| 只安装已声明的工具 | `mise install` / `mise install --locked` / `mise install --include-task-tools` |
| 试运行某版本不写配置 | `mise exec node@24 -- node -v` |
| 在配置范围内升级 | `mise upgrade node`（改锁文件）/ `mise upgrade --bump`（改 mise.toml 前缀） |
| 解析并写锁文件 | `mise lock` / `mise lock --bump node` |
| 环境变量读写 | `mise set KEY=VALUE` / `mise set` / `mise unset KEY` |
| 查看可用版本 | `mise ls-remote node` |
| 查找当前可执行文件 | `mise which node` / `mise where node` |
| 配置读写 | `mise config get/set`、`mise settings set/list` |
| 任务 | `mise tasks`、`mise tasks info <t>`、`mise run <t>` |
| 清理缓存 | `mise cache clear [tool]`、`mise cache prune --dry-run` |
| 自更新 | `mise self-update`（standalone 安装） |

## 路由到详细文档

| 主题 | 参考文件 |
| --- | --- |
| 安装、激活、shims/exec 选择、首个项目 | [references/getting-started.md](references/getting-started.md) |
| 配置文件分层、config environments、vars、settings、目录、idiomatic 版本文件 | [references/configuration.md](references/configuration.md) |
| 工具、backend、registry、`[tool_alias]`、`mise.lock`、shims/懒加载、deps、tool-stubs、mise oci | [references/dev-tools.md](references/dev-tools.md) |
| `[env]`、`env._` 指令、redaction、required、secrets、Tera 模板、url_replacements | [references/environments.md](references/environments.md) |
| 任务：TOML/文件任务、参数 usage、依赖、缓存、monorepo | [references/tasks.md](references/tasks.md) |
| bootstrap：系统包、文件、仓库、dotfiles、服务、macOS/systemd、远程、卸载 | [references/bootstrap.md](references/bootstrap.md) |
| CI、IDE、MCP、daemons、Docker | [references/integrations.md](references/integrations.md) |
| CLI 命令分组索引 | [references/cli-reference.md](references/cli-reference.md) |
| 排错、错误信息、安全(safe/paranoid/sandbox) | [references/troubleshooting.md](references/troubleshooting.md) |
| 语言/场景配方（node、python、ruby、terraform、docker…） | [references/recipes.md](references/recipes.md) |

## 与 `mise-tasks` 技能的关系

任务(`[tasks]`)的深度编排（依赖 DAG、参数、monorepo、缓存细节、release 工作流模式）另见本库中的 **`mise-tasks`** 技能。本技能覆盖 mise 全貌；需要专门设计任务工作流时，优先加载 `mise-tasks`。

## 工作方式建议

1. 动手前先 `mise config ls` 和 `mise ls --current`，确认配置文件与生效版本，而不是猜。
2. 修改工具版本优先用 `mise use`（会安装并写配置）；只想安装已声明工具用 `mise install`。
3. 需要可复现：提交 `mise.toml` + `mise.lock`(+ 可能的 `.mise/locks/` sidecar)，CI 用 `mise install --locked`。
4. 涉及执行第三方配置（任务、hook、`_.source`、插件）时提醒信任边界；自动化处理不可信配置用 `MISE_SAFE=1`。
5. 排错先看具体错误、再 `mise --verbose` / `MISE_DEBUG=1`、最后 `mise doctor`。

## 维护

- 官方文档变更后更新各 references 文件；命令行为以 `mise <cmd> --help` 与官方站为准（本机已装 mise 时以本机版本为准）。
- 大版本行为差异（如 `alias` → `tool_alias`、Tera v1→v2、`env.mise.*` → `env._.*`、`env_conf_d`、`auto_env` 等迁移）按文档标注的弃用时间线处理。
