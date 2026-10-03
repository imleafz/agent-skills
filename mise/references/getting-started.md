# 安装与接入

来源：<https://mise.jdx.dev/getting-started>、<https://mise.jdx.dev/installing-mise>

## 安装

| 平台 | 推荐 | 备选 |
| --- | --- | --- |
| macOS | `curl https://mise.run \| sh` | Homebrew |
| Linux | `curl https://mise.run \| sh` | apt/dnf/snap 等 |
| Windows | `scoop install mise` | `winget install jdx.mise` / `choco install mise` |
| Rust 用户 | `cargo binstall mise` | `cargo install mise` |
| CI/Docker | `mise.run` | GitHub Releases |

- 官方单文件二进制装到 `~/.local/bin`，支持 `mise self-update`；Homebrew/系统包安装由包管理器负责更新（`mise self-update` 可能被禁用）。
- Debian/Ubuntu：`sudo apt install -y extrepo && sudo extrepo enable mise && sudo apt update && sudo apt install -y mise`。
- Fedora/RHEL：`sudo dnf copr enable jdxcode/mise && sudo dnf install mise`。
- Snap：`sudo snap install mise --classic`。

开启自动更新（支持 self-update 的安装方式）：

```sh
mise settings auto_update=true
```

## 三种加载项目环境的方式

| 方式 | 适合 | 说明 |
| --- | --- | --- |
| `mise activate`（PATH 激活） | 交互式 shell | 每次提示符/切换目录时更新 PATH 与环境变量；推荐的交互方案 |
| shims（`mise activate --shims`） | 编辑器、需要固定可执行路径的程序 | 命令经 shim 分发到 mise；不支持全部特性（见下） |
| `mise exec` / `mise run` | 脚本、CI、一次性命令 | 显式加载，不依赖 shell 启动文件；`mise` 需在 PATH |

### 激活命令（按 shell，追加一次到 rc 文件；重复追加会产生重复 hook）

```sh
# bash
echo 'eval "$(~/.local/bin/mise activate bash)"' >> ~/.bashrc
# zsh
echo 'eval "$(~/.local/bin/mise activate zsh)"' >> ~/.zshrc
# fish
mkdir -p ~/.config/fish
echo '~/.local/bin/mise activate fish | source' >> ~/.config/fish/config.fish
# PowerShell
(&mise activate pwsh) | Out-String | Invoke-Expression   # 加到 $PROFILE
```

Homebrew + fish 会自动激活（禁用：`set -Ux MISE_FISH_AUTO_ACTIVATE 0`）。修改 rc 后重启 shell，用 `mise doctor` 自检。

### shims 与 PATH 激活的选择

shims 是 `~/.local/share/mise/shims` 下指向 mise 二进制的小可执行文件（`node -> mise`）。使用 shims 会失去/改变以下行为：

- `[env]` 定义的环境变量只有在调用某个 shim 时才生效（不是进入目录就生效）。
- `cd` / `enter` / `leave` / `watch_files` 钩子不触发（`preinstall`/`postinstall` 仍可用）。
- `which node` 会指向 shim，而非真实可执行文件（用 `mise which node` 查真实路径）。

交互场景优先 PATH 激活；给编辑器/IDE 配置固定可执行路径时用 shims。脚本里准备一次环境后执行子进程，可用 `mise exec -- bash script.sh`。

推荐的 shims 接入（登录 profile 用 `--shims`，交互 rc 用完整激活）：

```sh
# ~/.zprofile
eval "$(mise activate zsh --shims)"
# ~/.zshrc
eval "$(mise activate zsh)"
```

`mise reshim` 重建 shim 目录（仅当 shim 目录缺少应有内容时才需要）。`[settings.shims] exclude = ["python","python3"]` 可让 OS 自带命令不被 shim 覆盖。

### 懒加载工具（lazy tools）

```toml
[tools]
node = { version = "24", lazy = true }
"github:example/acme" = { version = "1.2.3", lazy = true, lazy_bins = ["acme", "acmectl"] }
```

`lazy = true`：裸 `mise install` 跳过它，首次调用其命令时才安装。`mise install --include-lazy` 或 `mise install node` 可提前安装。非 registry 的显式 backend 需用 `lazy_bins` 声明命令名。改完直接编辑的 lazy 声明后运行 `mise reshim`。

### 命令包装器（wrappers）

```toml
[tools]
mr-boxington = "1.4.1"

[wrappers.cargo]
command = "mbx"                       # 让 cargo 命令始终经 mbx
env = { MBX_CARGO_SHIM_MODE = "1" }

[wrappers]
terraform = "tofu"                     # 简写：无参数/env
```

加/删 wrapper 后运行 `mise reshim`。wrapper 优先级高于同名可执行文件。

## 首个项目

```sh
mkdir mise-example && cd mise-example
mise use node@24                       # 安装并写 [tools]
mise set NODE_ENV=development          # 写 [env]
```

```toml
[tools]
node = "24"

[env]
NODE_ENV = "development"

[tasks.hello]
description = "打印 node 版本与环境"
run = '''node -e "console.log(process.version, process.env.NODE_ENV)"'''
```

```sh
mise exec -- node -p process.env.NODE_ENV
mise run hello
mise config ls / mise ls --current / mise tasks ls   # 确认生效
```

Shell 特性兼容性（部分）：`mise activate`、`mise shell`、`chpwd` 钩子各 shell 均支持；`[shell_alias]` 仅 bash/zsh/fish 支持（nushell/elvish/xonsh/PowerShell 不支持）。

## 自动安装机制

- `mise x` / `mise r` 默认会先安装缺失的非 lazy 工具（设置 `exec_auto_install`、`task.run_auto_install`，默认 true）。
- 找不到命令时的 shell 处理器（`not_found_auto_install`，默认 true）会尝试按 registry 的 bin 元数据自动安装；`not_found_auto_install_registry`（默认 false）还能自动安装未配置但唯一匹配的工具并写入全局配置。
- 用 `auto_install_disable_tools` 对特定工具关闭。

## 下一步

- 写构建/测试命令：`references/tasks.md`。
- 编辑器/CI 集成：`references/integrations.md`。
- 声明整机设置（包、dotfiles、服务）：`references/bootstrap.md`。
