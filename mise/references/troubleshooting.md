# 排错、安全与缓存

来源：<https://mise.jdx.dev/troubleshooting>、`errors`、`faq`、`security`、`paranoid`、`sandboxing`、`cache-behavior`

## 排错流程

1. 看具体错误（折叠原因里冒号后面的才是根因）。
2. `mise --verbose <cmd>` → `MISE_DEBUG=1` → `MISE_TRACE=1`（trace 很详细，分享前审查凭据/路径）。
3. `mise doctor`（环境、目录、PATH、shim、配置信任状态）。
4. 工具通过 `mise exec` 能跑但直接命令不行 → 检查 shell 激活并重启 shell。

## 常见错误信息

| 错误 | 原因与处理 |
| --- | --- |
| `Config files in <dir> are not trusted...` | 配置需信任：审查后 `mise trust`；`mise trust --show` 查看状态。`ignored_config_paths` 里的路径永不加载。 |
| `<tool> not found in mise tool registry` | 无短名：检查拼写，或用显式 backend `aqua:`/`github:`/`cargo:`/`npm:` 等。 |
| `Failed to install <tool>@<version>: <err>` | 看冒号后的真实错误；`--verbose` 或 `mise install <t>@<v> --raw` 串行调试。 |
| `<tool>@<version> not installed` | `mise install`；用 `mise ls <tool>` 看已装/仅请求。 |
| `[<config>] <tool>@<version>: <err>`（解析失败） | 版本不存在（`mise ls-remote`）、缓存过期（`mise cache clear <tool>`）、网络/限流（见下）。 |
| `401 Unauthorized`（GitHub） | token 无效/过期/作用域不足；错误里的 `github auth:` 行指出 token 来源。 |
| `403` / `GitHub rate limit exceeded` | 限流或缺仓库权限；看 `github auth:`/`github rate limit:` 诊断行；配置 token 或等待。 |
| `Checksum mismatch for file <file>` | 下载字节与预期不符：核对工具/平台/URL/backend 选项；确认上游确实换包后 `mise lock <tool>` 刷新并审 diff。不要删校验和或禁用校验。 |
| `mise version <X> is required, but you are using <Y>` | `mise.toml` 的 `min_version` 更高：更新 mise。 |
| `no tasks <name> found` | 任务不存在：`mise tasks ls`，检查目录/环境/命名空间；`mise --cd <dir> tasks ls`。 |
| `<command> exited with non-zero status: exit code <N>` | 子命令失败：看其输出与工作目录/参数/工具/环境。 |

其它症状（版本不对、prompt 慢、激活问题、新版本不可用等）见 <https://mise.jdx.dev/troubleshooting.html>。

## 缓存行为

mise 分三类缓存，先定位症状对应哪一类：

```sh
mise cache path
mise cache clear node           # 清某工具的版本元数据（不会卸载工具）
mise cache prune --dry-run      # 预览过期缓存
mise cache task <name>          # 任务制品缓存
mise cache clear --task <name>
```

- 远端版本列表默认新鲜期 1 小时（`fetch_remote_versions_cache`）。
- 实验性 `env_cache`：缓存计算出的环境（存在 state 目录、加密）；`env_cache_ttl` 默认 1h；强制重算用 `MISE_ENV_CACHE=0`。
- 自动清理：`cache_prune_age` 默认 30 天；`"0s"` 关闭。
- 清缓存不会改变配置、不会卸载工具；版本被锁文件或精确固定"钉住"时，刷新元数据也不会换版本。

## 安全控制（作用域不同，别混淆）

| 控制 | 作用对象 | 目的 |
| --- | --- | --- |
| 下载校验 | 支持的安装 | 校验制品完整性与签名/provenance |
| 配置信任 `mise trust` | 加载项目配置 | 决定 mise 可执行/应用哪些配置 |
| Safe mode `MISE_SAFE=1` | 处理不可信项目配置 | 禁止项目代码执行与环境注入 |
| Paranoid `MISE_PARANOID=1` | 信任与安装校验 | 信任绑定内容哈希、安装时重新校验 provenance |
| Sandboxing | `mise exec`/`mise run` 启动的子进程 | 限制文件/网络/环境访问 |

### 软件校验

- aqua 有内置 Cosign/Minisign/SLSA/GitHub attestation 支持；Node.js/Swift 的 OpenPGP 内建（不需 gpg）。
- packslip 校验签名清单与制品摘要。
- 锁文件可记录 checksum 与 provenance；默认在校验和匹配时复用记录的 provenance。要每次重校验：`locked_verify_provenance = true` 或 paranoid。

### Safe mode（处理 PR 等不可信配置）

`MISE_SAFE=1`：拒绝模板 `exec()`/`read_file()`、任务执行、工具级 postinstall 与安装期 `install_env`、asdf 插件脚本与插件安装；跳过 hooks；忽略项目 `[env]`/指令/`[shell_alias]`/`[settings]`；`_.source` 处处忽略。HTTP 版本解析仍可用。`safe` 设置仅全局可设，项目无法把它关掉。它*不是* OS 沙箱，也不让命令变只读。

### Paranoid mode

`mise settings set paranoid true`（全局）。要求非全局配置显式信任；直接文件信任绑定内容哈希（改文件需重新信任）；关闭执行命令的自动信任与常规 CI 信任豁免；`--yes`/`MISE_YES=1`/CI 自动确认不视为信任。`trusted_config_paths` 与可信 monorepo 根仍是路径例外。社区插件同名安装需 `--yes`/CI/`--force`，或给出完整 Git URL。

## Sandboxing（`mise exec`/`mise run` 子进程）

```sh
mise exec --deny-net -- npm run build
mkdir -p dist && mise exec --allow-write=./dist -- npm run build
mise exec --deny-all --allow-read=. --allow-write=./dist -- node build.js
```

| 标志 | 作用 |
| --- | --- |
| `--deny-all` / `--deny-read` / `--deny-write` / `--deny-net` / `--deny-env` | 分别禁止读/写/网络/环境继承 |
| `--allow-read=<path>` / `--allow-write=<path>` | 白名单（隐含相应 deny） |
| `--allow-net=<host>` | macOS 主机例外（Linux 拒绝） |
| `--allow-env=<var>` | 放行环境变量，支持通配 `MYAPP_*` |

- 任务内可声明：`deny_net = true`、`allow_write = ["./dist"]` 等；全局用 `[settings.sandbox] deny_*`。
- 平台：Linux 用 Landlock/sepccomp（`--allow-net` 不支持）；macOS 用 Seatbelt（主机例外按解析到的 IP，且可能被 `sandbox-exec` 拒绝）；Windows 不强制文件/网络限制（会告警后不加限制运行）。
- 隐式保留：系统路径可读、`/tmp`、`/dev` 可写、`MISE_DATA_DIR` 可读；环境过滤时 `PATH`/`HOME`/`USER`/`SHELL`/`TERM`/`COLORTERM`/`LANG` 保留。
- Linux 的 allow 路径必须已存在（Landlock 绑定已有 fd）；要允许任务创建内容需允许其已存在的父目录。

## 快速自检清单

- 版本不对：`mise config ls` → 确认真正生效的文件；`mise ls --current`；注意环境文件与 local 文件优先级。
- 工具装不上：`mise doctor`、`mise ls-remote <tool>`、`MISE_DEBUG=1 mise install <tool>`。
- CI 与本地不一致：确认提交了 `mise.lock` 且用了 `--locked`；确认 `MISE_DATA_DIR` 一致。
- prompt 慢：见官方 "slow shell prompts"（可能来自模板 `exec()`、`_.source`、大量 idiomatic 文件扫描）。
