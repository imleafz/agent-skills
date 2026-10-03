# 任务（Tasks）

来源：<https://mise.jdx.dev/tasks>、`tasks/task-configuration`、`running-tasks`、`task-arguments`、`file-tasks`、`caching`、`monorepo`、`hooks`
> 深度任务编排（复杂 DAG、release 工作流、polyglot monorepo 模式）见本库 **`mise-tasks`** 技能。

## 三种任务格式

| 格式 | 适用 | 配置位置 |
| --- | --- | --- |
| TOML 任务 | 命令短或主要配依赖/选项 | `mise.toml` 的 `[tasks.<name>]` |
| 文件任务 | 脚本需要编辑器语法高亮/lint | `mise-tasks/`、`.mise/tasks/`、`mise/tasks/`、`.config/mise/tasks/` 等 |
| 任务模板 | 多个任务共享配置 | `[task_templates.<name>]` + `extends` |

```toml
[tasks.hello]
description = "检查任务执行"
run = "echo hello from mise"
```

```bash
# mise-tasks/build
#!/usr/bin/env bash
#MISE description="Build the CLI"
#MISE depends=["lint"]
cargo build
```

文件任务需 `chmod +x`（Windows 见官方文档）。

## 常用任务属性

| 属性 | 说明 |
| --- | --- |
| `run` | 命令或步骤数组；可混 `{ task = "t", args = [...], env = {...} }`（串行步骤）与 `{ tasks = ["t2","t3"] }`（并行） |
| `run_windows` | Windows 专用命令 |
| `file` | 执行外部脚本/URL/`git::`，相对路径相对配置文件目录 |
| `description` | 帮助、补全、`mise tasks` 中可见 |
| `alias` | 别名（同名真实任务优先） |
| `depends` | 前置任务（可传参），共享依赖只跑一次 |
| `depends_post` | 成功后的任务 |
| `wait_for` | 仅在目标已在运行时等待，不触发 |
| `dir` | 工作目录 |
| `env` | 任务专属环境变量（不传给 depends） |
| `tools` | 任务专属工具版本 |
| `sources` / `outputs` | 新鲜度检查（跳过已最新） |
| `cache` | 实验性制品缓存（见下） |
| `daemons` | 任务前启动的 daemon（实验） |
| `hide` | 从 `mise tasks` 隐藏 |
| `quiet` / `silent` | 减少/屏蔽输出 |
| `raw` | 直连 stdin/stdout（禁用并行与 redaction） |
| `shell` | 自定义内联 shell（如 `"bash -c"`） |
| `usage` | 参数规格（见下，优于旧 Tera 参数） |
| `confirm` | 执行前确认 |
| `vars` | 任务局部变量 |

运行时注入的变量：`MISE_ORIGINAL_CWD`、`MISE_CONFIG_ROOT`、`MISE_PROJECT_ROOT`、`MISE_MONOREPO_ROOT`（仅 monorepo）、`MISE_TASK_NAME`、`MISE_TASK_COLOR`、`MISE_TASK_DIR`、`MISE_TASK_FILE`。

## 运行

```bash
mise run build                 # 别名 mise r / mise build
mise run test build            # 多个任务
mise run test ::: build        # ::: 分隔任务与各自参数
mise run                       # 有 default 就跑 default，否则打开选择器
mise run 'test:*'              # 通配
mise tasks ls [--hidden] [--all]
mise tasks info <task>
```

- mise 标志放任务名前（`mise run --silent build`）；任务名之后的标志属于任务。
- 默认最多 8 并行；`--jobs`/`jobs`/`MISE_JOBS` 调整。输出模式 `--output`/`task.output`/`MISE_TASK_OUTPUT`（`prefix`、`interleave`、`keep-order`、`replacing`、`timed`）。

### 参数：推荐 `usage`

```toml
[tasks.deploy]
description = "Deploy application"
usage = '''
arg "<environment>" help="Target environment" {
  choices "dev" "staging" "prod"
}
flag "-v --verbose" help="Enable verbose output"
flag "--region <region>" default="us-east-1" env="AWS_REGION"
'''
run = '''
#!/usr/bin/env bash
printf 'env=%s region=%s\n' "${usage_environment?}" "${usage_region?}"
'''
```

参数自动变成 `usage_*` 环境变量；Tera 里也可用 `{{ usage.environment }}`（注意用 `| quote`，布尔用 `| str`）。文件任务用 `#USAGE` 注释。无 usage 时：`run` 是数组则参数只给最后一项；内联命令按字面追加；shebang 脚本按解释器正常暴露 `$1`/`$@`。

## 缓存

- **新鲜度检查**：`sources` + `outputs` 比较修改时间；输出比源新则跳过（保留现有产物）。
- **制品缓存**（实验，需 `experimental = true`，且有匹配 source 与显式 outputs 或 `outputs = []`）：

```toml
[settings]
experimental = true

[tasks.build]
run = "npm run build"
sources = ["package.json", "src/**"]
outputs = ["dist"]
cache = { enabled = true, env = ["NODE_ENV"] }
```

`outputs = []` 表示任务无文件系统副作用（如 lint/test/typecheck），命中时只回放日志。缓存命令：`mise cache task <name>`、`mise cache clear --task <name>`。

## Monorepo 任务

```toml
# 仓库根 mise.toml
monorepo_root = true
[monorepo]
config_roots = ["projects/frontend", "projects/backend"]
[tools]
node = "20"
```

任务被命名空间化：`//projects/frontend:build`。常用：

```bash
mise run //projects/frontend:build
mise run :build            # 当前 config_root
mise run //...:test        # 所有项目
mise run '//projects/...:build'
```

`[monorepo.path_aliases]` 可给长路径起短名。`[monorepo] lockfile = true` 使用仓库根锁文件（迁移中；`lockfile = false` 保持每子项目锁文件）。需信任 monorepo 根以信任后代配置（paranoid 模式除外）。

## 事件钩子（hooks）

除 `preinstall`/`postinstall` 外，hooks 需要 `mise activate`。

```toml
[hooks]
cd = "echo changed dir"
enter = "echo entered project"
leave = "echo left project"
preinstall = "echo about to install"
postinstall = "echo installed"

[hooks.enter]                 # 当前 shell 执行（可影响本 shell）
shell = "bash"
script = ["source completions.sh", "export READY=1"]

[hooks]
enter = ["echo a", { task = "setup" }]   # 也可引用任务

[[watch_files]]
patterns = ["src/**/*.rs"]
run = "cargo fmt"
```

- 多个配置文件都定义同名 hook 时**全部执行**，从高优先级到低优先级；同一文件内数组按序。
- `postinstall` 收到 `MISE_INSTALLED_TOOLS`（JSON 数组，含 `name`/`version`/`requested_version`/`backend`/`install_path`；无操作安装时为 `[]`）。
- 工具级 `postinstall` 见 `dev-tools.md`。
- 钩子环境变量：`MISE_PROJECT_ROOT`、`MISE_CONFIG_ROOT`、`MISE_PREVIOUS_DIR`、`MISE_ORIGINAL_CWD`。
