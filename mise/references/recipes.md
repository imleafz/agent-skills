# 配方与语言要点

来源：<https://mise.jdx.dev/mise-cookbook/>、`lang/*`、`dev-tools/comparison-to-asdf`、`installing-mise`

## 从 asdf 迁移

1. 装 mise；在项目目录 `mise config ls` 与 `mise ls --current` 查看它是如何读现有 `.tool-versions` 的。
2. `mise install`，然后用 `mise exec -- node --version` 验证（用你项目的工具替换）。
3. 项目可用后，移除 shell 启动文件里的 asdf 激活与 shim PATH，`mise activate`，开新 shell，检查 `mise doctor` 与 `command -v node`。

- mise 使用自己的安装目录，不会自动复用 asdf 的安装。
- 若团队仍用 asdf，保留共享 `.tool-versions`；更新它用 `mise use --path .tool-versions --pin node@24`，不要写入 mise 专有前缀/backend 标识。
- 命令对照：`asdf install nodejs 24.0.0` → `mise install node@24.0.0`；`asdf set ...` → `mise use ...`（会安装）；`asdf set -u` → `mise use -g`；`asdf list all` → `mise ls-remote`；`asdf current` → `mise ls --current`；`asdf which` → `mise which`；`asdf reshim` → `mise reshim`。
- 旧名 `nodejs`/`golang` 仍识别，但 TOML 用规范名 `node`/`go`。

## Cookbook 索引

| 场景 | 文档 |
| --- | --- |
| Bazel 从项目版本文件选版本 | `mise-cookbook/bazel` |
| CMake/C++ | `mise-cookbook/cpp` |
| Docker 内安装与共享工具 | `mise-cookbook/docker` |
| 运行 npm 脚本 / 选包管理器 | `mise-cookbook/nodejs` |
| requirements/uv/inline 脚本 | `mise-cookbook/python` |
| Rails/Bundler | `mise-cookbook/ruby` |
| Terraform/OpenTofu | `mise-cookbook/terraform` |
| Neovim 任务高亮/LSP | `mise-cookbook/neovim` |
| 项目脚手架（presets） | `mise-cookbook/presets` |
| shell 提示符与集成 | `mise-cookbook/shell-tricks` |

## Node

```sh
mise use node@24
mise exec -- node -v
```

- 多版本：`mise use node@22 node@24`；版本化可执行文件 `node22`/`node24`。
- package.json 支持：启用 idiomatic 文件后读取 `devEngines`/包管理器声明，**不读** `engines`（那是兼容范围）。`mise settings add idiomatic_version_file_enable_tools node`；可用 `idiomatic_version_file_disable_files node:package.json` 排除。
- npm 全局安装新命令后可能需要 `mise reshim`（或用 core plugin 的 `node.npm_shim` wrapper）。
- 默认 `minimum_release_age=24h` 会避开全新发布。

## Python

```sh
mise use python@3.14
mise exec -- python --version
mise use python@3.13 python@3.14      # 多版本；python3.14 为版本化可执行文件
```

两种虚拟环境机制（选择其一）：

```toml
# 使用 uv 的项目（存在 uv.lock）
[settings]
python.uv_venv_auto = "create|source"   # 或 "source"

# 不使用 uv 的项目
[env]
_.python.venv = { path = ".venv", create = true }
```

- `_.python.venv` 选项：`path`、`create`、`python`、`python_create_args`、`uv_create_args`（如 `["--seed"]` 让 venv 有 pip）。
- `uv_venv_auto` 依赖 `uv.lock` 存在（靠它定位 uv 项目）；尊重 `UV_PROJECT_ENVIRONMENT`。
- 想让 uv 用 mise 管理的解释器：`UV_PYTHON = { value = "{{ tools.python.path }}", tools = true }`。
- 虚拟环境激活需要 `mise activate` 或 `mise exec`；仅 shims 时 venv 的 `bin/` 不会进 PATH。
- 默认下载预编译 python-build-standalone；禁用：`mise settings python.compile=1`。freethreaded：`MISE_PYTHON_PRECOMPILED_FLAVOR=freethreaded+pgo-full`。
- 旧的 `virtualenv` 工具选项与 `.default-python-packages` 已弃用。

## Ruby / Go / Rust / 其它

- Ruby：`mise use ruby@3.3`；预编译构建有 build revision，锁文件在平台 `url` 里记录（见官方 `lang/ruby`）。
- Go：启用 idiomatic 后读取 `go.mod`/`go.work` 的 `toolchain goX.Y.Z`（`go X.Y` 是弃用的最低要求）。`GOWORK` 行为见官方 `lang/go`。
- Rust：`rust-toolchain.toml` 作为 idiomatic 文件（需启用）。
- 各类 backend 的运行时前提（npm 需 node、gem 需 ruby、cargo/go 需编译工具链）见 `dev-tools.md` 与各 backend 文档。

## 预设与脚手架

`mise-cookbook/presets` 介绍如何用 `[task_templates]` / 配置片段做自己的项目脚手架；`mise generate config`、`mise generate devcontainer`、`mise generate github-action`、`mise generate task-stubs` 等可生成初始文件。

## 版本管理最佳实践

- 用 `min_version` 声明*需要*的新特性，而不是把所有人钉死在某个 mise 版本；固定 mise 版本只适合受控 CI，并需计划更新。
- 提交 `mise.toml` + `mise.lock`；`.local` 变体 gitignore。
- 团队更新流程：改配置 →（若需要）`mise lock`/`mise upgrade` → 审 `mise.toml`/`mise.lock`(+ sidecar) diff → `mise install --locked` → 跑项目检查 → 提交。
