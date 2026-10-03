# Bootstrap：整机初始化

来源：<https://mise.jdx.dev/bootstrap>、`bootstrap/*`、`dotfiles`、`history`
> 声明式地配置整机：系统包、文件、仓库、dotfiles、服务、macOS 偏好、systemd、shell 激活，并运行工具安装与收尾任务。用于工作站/服务器开箱。

## 快速开始

```toml
[bootstrap.mise_shell_activate]
zprofile = "shims"
zshrc = "activate"

[tools]
node = "24"

[tasks.bootstrap]
run = "node --version"
```

```sh
mise trust
mise bootstrap --dry-run
mise bootstrap
mise bootstrap status
mise bootstrap plan          # 结构化资源计划（--json / --detailed-exitcode）
```

`--yes` 跳过确认（无人值守）。dry-run 只打印将要做的操作，不执行 hook 与收尾任务。

## 从仓库启动

| 仓库内容 | 命令 | 落点 |
| --- | --- | --- |
| 含 `mise.toml`+源文件的 bootstrap 项目 | `mise bootstrap --from <url>` | 单独 checkout（默认 `$MISE_DATA_DIR/bootstrap-repo`），再按项目目标部署 |
| 全局 mise 配置（config.toml、conf.d/、tasks/） | `mise bootstrap --adopt <url>` | `$MISE_CONFIG_DIR`（默认 `~/.config/mise`） |
| 通过 `mise dot origin set` 共享的 dotfiles | `mise bootstrap --adopt <url>` | 各文件在本机路径 |

`--from` 支持 `?ref=` 选分支/标签/提交，`--update` 快进，`-E work` 选择环境。`--adopt` 识别 `.mise-history/format.toml` 标记后会拉取历史、恢复文件、记住 origin，再用恢复的配置跑 bootstrap。

## 运行顺序（`mise bootstrap`）

1. `[bootstrap.secrets]` 预检（供文件模板用）
2. `accounts apply`（`[bootstrap.users]`/`[bootstrap.groups]`）
3. `plugins apply`（`[bootstrap.plugins]`），随后 `phase = "pre-packages"` 的文件/目录
4. 内置包管理器安装 `[bootstrap.packages]`
5. `files apply`（`[bootstrap.files]`/`[bootstrap.directories]`，默认 `post-packages` 阶段）
6. `services`（Linux systemd / macOS / Windows 用户服务；`requires_tools=true` 的等到工具装完）
7. `firewall apply`（`[bootstrap.linux.firewall]`）
8. `compose apply`（`[bootstrap.compose]`）
9. `repos apply`（`[bootstrap.repos]`）
10. `mise dot apply`（`[dotfiles]`）
11. `mise-shell-activate apply`
12. `macos defaults apply`
13. `macos launchd-agents apply`
14. `linux systemd-units apply`
15. `user apply`（如 `login_shell`）
16. `mise install`（`[tools]`）
17. 插件型包管理器；`requires_tools` 用户服务
18. `mise run bootstrap`（若存在该任务）
19. `[bootstrap.hooks.final]`

`--skip <part>` / `--only <part>`（可逗号或重复；二者互斥）。part 名：`accounts`、`plugins`、`packages`、`files`、`services`、`firewall`、`compose`、`repos`、`dotfiles`、`mise-shell-activate`、`macos-defaults`、`macos-launchd-agents`、`linux-systemd-units`、`user`、`tools`、`task`、`final-hook`。`--update` 刷新包管理器元数据与声明仓库。hook 阶段：`pre/post-packages`、`pre/post-repos`、`pre/post-dotfiles`、`pre/post-defaults`、`pre/post-user`、`pre/post-tools`。

每次变更运行都会记录一对 history checkpoint（前/后），dry-run 不记录：`mise dot history`。

## 配置落点（What goes where）

| 配置 | 用途 |
| --- | --- |
| `[bootstrap.secrets]` | 托管文件模板所消费的密钥输入名 |
| `[bootstrap.users]` / `[bootstrap.groups]` | Linux 服务账号与组 |
| `[bootstrap.files]` / `[bootstrap.directories]` | 托管系统路径、内容、属主、权限 |
| `[bootstrap.services]` | Linux/macOS/Windows 用户服务；已有 Linux 系统服务 |
| `[bootstrap.compose]` | Docker Compose 项目生命周期 |
| `[bootstrap.plugins]` | 包管理器插件 |
| `[bootstrap.packages]` | OS 包（apk/apt/dnf/pacman/brew/flatpak/mas/scoop/winget/aur/nix/zypper） |
| `[bootstrap.repos]` | dotfiles 前克隆的 git 仓库 |
| `[dotfiles]` | 追踪/生成/编辑 dotfiles |
| `[bootstrap.mise_shell_activate]` | shell 启动文件中的 mise 激活片段 |
| `[bootstrap.macos.*]` | macOS 偏好（defaults）/LaunchAgents |
| `[bootstrap.linux.systemd.units]` | systemd 用户服务 |
| `[bootstrap.linux.firewall]` | Linux 主机防火墙策略与规则 |
| `[bootstrap.user]` | 当前用户设置（如 `login_shell`） |
| `[bootstrap.hooks]` | 各阶段命令 |
| `[tools]` / `[tasks.bootstrap]` | 工具 / 自定义收尾 |

用声明式小节让 mise 收敛状态；用 `[tasks.bootstrap]` 处理不合适的命令式设置（每次 bootstrap 都会再跑，需自行去重）。

## 常用

```sh
mise bootstrap status [--json] [--missing]
mise bootstrap packages status / repos status / mise dot status
mise bootstrap packages use apk:zlib-dev apt:libssl-dev winget:BurntSushi.ripgrep.MSVC
mise dot add ~/.zshrc         # 已管理文件：把编辑保存回源
mise dot edit ~/.zshrc && mise dot apply ~/.zshrc
mise dot track ~/.zshrc       # 让文件自带历史
mise dot history show latest / diff 11 12 / rollback <id>
```

- 默认拒绝覆盖冲突的 dotfile 整体文件；确需替换用 `mise bootstrap --force-dotfiles`。
- bootstrap 是*序列*不是事务：后面阶段失败不会回滚前面已成功的改动；修好后重跑。

## 模块（config environments）

把按应用/角色的可选设置放进 `config.<name>.toml`，作为模块组合：

```toml
# ~/.config/mise/config.ssh.toml
[bootstrap.packages]
"apt:openssh-client" = "latest"
```

```toml
# ~/.config/mise/miserc.toml
env = ["ssh", "gpg"]
```

同目录后者优先；`mise -E ssh,gpg bootstrap` 可临时选择。用 `mise bootstrap plan --json` 的 `origin.config`/`origin.environment` 追溯资源来源。

**移除模块资源**：先从 `env` 移除模块（下次 bootstrap 不再应用），保留其配置文件，然后：

```sh
mise bootstrap unapply ssh --dry-run
mise bootstrap unapply ssh
```

它对比"含/不含该环境"的配置差异来移除托管文件/目录/用户服务/dotfile 条目。仍被基础配置或其他模块声明的资源会保留；类型不符的路径即使 `--force` 也保留。包、仓库、Compose 需要各自单独清理（见文档）。

## 模板与 hook

`[bootstrap]` 中只有部分内容会被 Tera 渲染：systemd unit、launchd agent 的字符串值、hooks 命令、`[bootstrap.files]` 内容（仅 `template = true`）、`[dotfiles]` 内容（仅 `mode = "template"`/`template = "tera"`）。文件内容模板额外得到 `{{ target }}` 与 `{{ secret(name="...") }}`。渲染用声明它的配置的上下文。

```toml
[bootstrap.hooks.post-tools]
run = ["mise exec -- node --version", "mise exec -- python --version"]

[bootstrap.hooks]
post-defaults = "killall Dock || true"
```

hook 失败会中止 bootstrap；dry-run 只打印。`{{ exec(...) }}` 可用于 hooks 与文件内容模板，但**不能**用于 unit/agent 值。hooks 用当前进程环境；需要 `[tools]` 的工具用 `mise exec -- ...` 或 `[tasks.bootstrap]`。
