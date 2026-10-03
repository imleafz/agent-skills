# CLI 命令索引

来源：<https://mise.jdx.dev/cli/>（每个命令都有 `--help`；本机以 `mise <cmd> --help` 为准）

## 工具与版本

| 命令 | 作用 |
| --- | --- |
| `mise use [tool@version...]` | 安装并写入配置；`-g` 全局、`--pin` 写具体版本、`--path <file>`、`--env <name>`、`--fuzzy` |
| `mise unuse <tool...>` | 从配置移除；默认作用于第一个声明该工具的已加载配置 |
| `mise install [tool@version...]` | 只安装（不改声明）；`--locked`、`--system`、`--include-task-tools`、`--include-lazy`、`--monorepo`、`--force` |
| `mise uninstall` | 卸载已安装版本 |
| `mise upgrade [tool...]` | 在请求范围内升级并更新锁文件；`--bump` 改 mise.toml 前缀、`--interactive` |
| `mise outdated` | 列出有新版本的已装工具 |
| `mise latest <tool>` | 打印某工具最新版本 |
| `mise ls [tool]` | 列出工具/安装；`--current`、`--json` |
| `mise ls-remote <tool>` | 列出可安装版本 |
| `mise which <tool>` / `mise where <tool>` | 已选可执行文件路径 / 安装目录 |
| `mise tool <name>` | 显示该工具会用的 backend 与校验 |
| `mise registry [name]` | 查看/搜索 registry 短名 |
| `mise search` | 交互式搜索工具 |
| `mise prune` | 清理未安装的版本链接 |
| `mise link` / `mise install-into` | 链接已有安装 / 安装到指定目录 |
| `mise tool-stub` | tool stub 运行时（脚本 shebang 调用） |
| `mise test-tool <tool>` | 测试某工具安装流程 |

## 环境与配置

| 命令 | 作用 |
| --- | --- |
| `mise set KEY=VALUE` / `mise unset KEY` | 写/删环境变量；`--age-encrypt`、`--prompt`、`--file` |
| `mise env` | 导出环境；`--json`、`--dotenv`、`--redacted`、`--values`、`--shell <s>` |
| `mise en [shell]` | 新开带项目环境的 shell |
| `mise exec [tool@v] -- <cmd>`（`x`） | 用项目环境执行命令；`--no-deps`、sandbox flags |
| `mise run`（`r`） | 运行任务（见下） |
| `mise config` | 显示/交互查看已加载配置 |
| `mise config get\|set\|ls` | 读取/写入配置值 |
| `mise settings get\|set\|add\|unset\|ls` | 读写 mise 设置；`--local`、`--all`、`--json-extended` |
| `mise shell-alias get\|set\|unset\|ls` | shell 别名 |
| `mise shell <tool@v>` | 用某版本开新 shell |
| `mise edit` | 打开/编辑配置（`mise edit -p` 等） |
| `mise fmt` | 格式化 `mise.toml` |
| `mise trust [path]` / `mise untrust` | 信任/取消信任配置；`--show` |
| `mise activate <shell>` / `mise deactivate` | shell 集成；`--shims` |
| `mise hook-env` | 供 shell 集成导出环境（activate 自动调用） |
| `mise bin-paths` | 打印当前工具 bin 目录（用于 PATH） |
| `mise reshim` / `mise reshim --system` | 重建 shim |
| `mise doctor` | 自检；`mise doctor path`、`mise doctor project` |
| `mise generate ...` | 生成 scaffold：`config`、`devcontainer`、`git-pre-commit`、`github-action`、`install-script`、`task-docs`、`task-stubs`、`tool-stub` |
| `mise completion <shell>` | 生成补全 |
| `mise self-update` | 更新 mise 本体（standalone 安装） |
| `mise implode` | 卸载 mise 本体及其数据 |
| `mise version` | 版本信息 |

## 任务

`mise run [--jobs N] [--output MODE] [-f] <task> [args...] [::: task2 ...]`
`mise tasks ls [--hidden] [--all]`、`tasks info`、`tasks graph`、`tasks deps`、`tasks add`、`tasks edit`、`tasks validate`。

## 锁定、后端与令牌

| 命令 | 作用 |
| --- | --- |
| `mise lock [tool...]` | 生成/更新锁文件；`--bump`、`--platform`、`--global`、`--local`、`--dry-run`、`--json`、`--sidecars`、`--upgrade` |
| `mise backends ls` / `mise backends switch <tool>` | 列出后端 / 按 registry 切换锁定工具后端 |
| `mise token github\|gitlab\|forgejo [token]` | 管理托管令牌 |
| `mise packslip pins` / `packslip forget` | 管理 Packslip 信任 |

## bootstrap 与 dotfiles

`mise bootstrap [--from|--adopt <url>] [--only|--skip <part>] [--dry-run] [--yes] [--update] [--force-dotfiles]`
子命令：`bootstrap status`、`bootstrap plan`、`bootstrap unapply`，以及 `bootstrap accounts|plugins|packages|files|services|firewall|compose|repos|secrets|dotfiles|mise-shell-activate|macos|linux|user|systemd|launchd|remote` 各自的 `apply`/`status`。
`mise dot`（`mise dotfiles` 的别名）：`add`、`apply`、`capture`、`diff`、`edit`、`exclude`、`include`、`origin set`、`paths`、`pull`、`recover`、`rollback`、`save`、`status`、`sync`、`track`、`unapply`、`undo`、`untrack`、`watch`、`history`（ls/show/diff/describe）。

## 其它

| 命令 | 作用 |
| --- | --- |
| `mise deps` | 项目依赖安装器（`install`/`add`/`remove`，见 dev-tools.md） |
| `mise daemons ...` | 后台进程管理（`ls`/`start`/`stop`/`restart`/`status`/`logs`/`tui`/`prune`/`providers ...`） |
| `mise cache path\|clear\|prune\|task` | 缓存管理 |
| `mise ssh ...` | 通过 SSH 在远端运行 |
| `mise sync node\|python\|ruby` | 同步工具版本到对应生态文件 |
| `mise watch [--task]` | 文件监听运行（独立于 `watch_files` hook） |
| `mise mcp` | 启动 MCP server（实验） |
| `mise oci build\|run\|push` | 从 mise.toml 构建镜像（实验） |
| `mise skills ls\|sync` | 管理 mise 技能（如已启用） |
| `mise patrons` / `sponsors` | 赞助信息 |

常用全局标志：`-C/--cd <dir>`、`-E/--env <name>`、`--verbose`/`--debug`/`--trace`、`--quiet`、`--yes`、`--dry-run`、`--json`、`--log-level`。
