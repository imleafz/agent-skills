# 环境变量、模板与密钥

来源：<https://mise.jdx.dev/environments>、`templates`、`url-replacements`、`environments/secrets/`

## `[env]` 基础

```toml
[env]
NODE_ENV = 'production'
EMPTY = false                    # 清除/取消变量
FALLBACK = { default = "development" }   # 已有非空值则保留，否则设默认
DATABASE_URL = { required = true }       # 只校验，不赋值（可由更晚的配置或进程环境提供）
SECRET = { value = "my_secret", redact = true }
```

- `required` 支持帮助文本：`{ required = "说明如何设置" }`；缺失时报错（shell 激活时只 warning 并继续）。
- value 指令：`default`、`required`、`redact`、`value`，以及 `env._` 指令（下述）。
- CLI：`mise set KEY=VALUE`、`mise set`、`mise unset KEY`、`mise env [--json|--dotenv|--redacted|--values]`、`mise en`（新开带环境的 shell）。

### 顺序与延迟求值

env 默认在工具之前解析（这样工具安装子进程能拿到变量）。需要用到工具产生的变量时用 `tools = true`，在该值上延迟到工具环境就绪后解析：

```toml
[env]
MY_VAR = { value = "tools path: {{ env.PATH }}", tools = true }
NODE_VERSION = { value = "{{ tools.node.version }}", tools = true }
_.path = { path = ["{{ env.GEM_HOME }}/bin"], tools = true }
```

`MISE_DATA_DIR` 等"配置 mise 自身"的变量在进程启动时读取，必须在 shell/CI 环境里设置，不能放在 `[env]`。

### Redaction（脱敏）

```toml
redactions = ["SECRET_*", "*_TOKEN", "PASSWORD"]

[env]
SECRET = { value = "x", redact = true }
TEST_TOKEN = { value = "not-sensitive", redact = false }   # 排除匹配
```

只在 mise 捕获的任务输出里逐行遮蔽；`raw = true` 的任务绕过。`mise env` 会导出真实值（`--redacted` 只是筛选，不隐藏）。CI 里可用 `mise env --redacted --json` 生成 mask。

## `env._` 指令

### `_.file`

```toml
[env]
_.file = '.env'
_.file = ['.env.json', '/abs/.env', { path = ".secrets.yaml", redact = true }]
_.file = { path = ".env", tools = true }
```

支持 dotenv/json/yaml/toml；相对路径相对该配置的 config_root；选项 `redact`、`tools`、`expand`（结构化文件中默认禁用 shell 展开以保留字面 `$`；`expand = true` 允许引用同/早先文件或 `[env]` 里已定义的值）。自动加载当前目录及父目录 dotenv：设 `MISE_ENV_FILE=.env` 或 `[settings] env_file = ".env"`。

### `_.path`

```toml
[env]
_.path = './bin'
_.path = ["~/.local/share/bin", "{{ config_root }}/node_modules/.bin", "tools/bin"]
```

相对路径相对 `{{ config_root }}`。

### `_.source`

```toml
[env]
_.source = "./script.sh"
_.source = [{ path = ".secrets.sh", redact = true }]
```

必须是可被 `source` 执行的 bash 脚本（shebang 被忽略）。脚本只能*前置* PATH（保留原值作为后缀），追加/重排/替换不支持。

### 插件提供的指令

`_.<plugin-name> = { ... }` 调用已装 env 插件的 `MiseEnv`/`MisePath` hook（如 Vault 密钥、按 git 分支设环境）。需先安装相应插件。

## `config_root` 与相对路径

`config_root` 是配置所属项目根目录（即使配置在 `.config/mise/config.toml` 或 `.mise/config.toml`）。`env._` 的相对路径都以它解析。示例：`_.source = "scripts/env.sh"` 等于 `{{config_root}}/scripts/env.sh`。

## Tera 模板

`mise.toml` 除本身不是模板外，大多数值可渲染。`.tool-versions` 与 `.miserc.toml`（受限上下文）也支持。用 `{% raw %}...{% endraw %}` 保留字面 `{{`/`{%`/`{#`。

模板上下文：

| 变量 | 含义 |
| --- | --- |
| `env` | 当前环境变量 map |
| `vars` | `[vars]` 定义的值 |
| `cwd` | 调用目录 |
| `config_root` | 配置所属项目根 |
| `config_source` | 模板所在配置文件绝对路径（不做符号链接解析，可 `| canonicalize`） |
| `mise_bin` / `mise_pid` | mise 可执行文件 / PID |
| `mise_env` | 显式 config environments 列表 |
| `xdg_*_home` | XDG 目录 |
| `tools` | 工具信息（任务模板与 `tools = true` 的 env 指令中可用；多版本时为数组） |
| `usage` | 任务 `usage` 解析后的参数 map（仅任务 run 内） |

常用函数：`exec(command)`（有副作用，dry-run 也会执行！）、`get_env(name, default)`、`read_file(path)`、`arch()`、`os()`、`os_family()`、`num_cpus()`、`choice(n, alphabet)`。任务内还有 `task_source_files()`（可按 `only_changed=true` 拿变更文件）。

常用过滤器/路径：`trim`、`replace`、`lower`/`upper`、`join`、`split`、`default`、`hash`/`hash_file`、`quote`（POSIX shell 引号，插入命令时用）、`jq` 等同 Tera；路径用 `join_path`、`dirname`、`basename`、`canonicalize`、`absolute`。

mise 使用 **Tera v2**。旧 v1 写法有兼容层但会逐步告警并在 2027.4.0 移除；临时逃生用 `MISE_TERA_V1=1`（或 `[env] MISE_TERA_V1 = true`，兼容旧 mise）。v2 新增切片/展开/列表推导/可选链/三元。

## 密钥（Secrets）

| 方案 | 仓库里存什么 | 运行时需要 |
| --- | --- | --- |
| fnox（推荐） | 密钥引用或加密值 | fnox 及其 provider |
| sops（实验） | 加密的 json/yaml/toml 文件 | 解密身份；非内置 age 提供方需 SOPS CLI |
| 直接 age（实验） | `mise.toml` 内个别加密值 | age 或 SSH 解密身份 |

### 直接 age 加密

```toml
[env]
DB_PASSWORD = { age = { value = "<base64>" } }
```

```sh
mise settings set experimental=true
mise set --age-encrypt --prompt DB_PASSWORD      # 默认用 SSH key 或 ~/.config/mise/age.txt
```

标志：`--age-encrypt`、`--age-recipient`、`--age-ssh-recipient`、`--age-key-file`、`--prompt`。解密身份查找顺序：`MISE_AGE_KEY` → `settings.age.identity_files` → `settings.age.key_file` → `~/.config/mise/age.txt` → SSH 身份。解密值总是标记为 redacted。默认严格（无法解密即失败）；`mise settings set age.strict=false` 可跳过。

sops：详见 <https://mise.jdx.dev/environments/secrets/sops.html>。

## 任务内环境

```toml
[tasks.print]
run = "echo $MY_VAR"
env = { _.file = '/path/to/file.env', "MY_VAR" = "my variable" }
```

## url_replacements：镜像/代理路由

只作用于 mise HTTP 客户端（发布元数据、制品下载、Conda channel），不改插件/Git/外部包管理器自己的请求。按插入顺序匹配，命中第一个产生有效新 URL 的规则后停止（不链式）；只改请求去向，不改选中的资产或校验和。

```toml
[settings.url_replacements]
"https://example.com/" = "https://mirror.example.com/"
'https://github.com/' = "https://hub.example.com/github/"

[settings]
url_replacements = {
  'regex:^https://github\.com/([^/]+)/([^/]+)/releases/download/(.+)' = "https://hub.example.com/artifactory/github/$1/$2/$3",
}
```

- 普通键是整条 URL 的**子串匹配**（`github.com` 也会匹配 `api.github.com`）；要精确主机用锚定正则 `'regex:^https://github\.com/'`。
- `regex:` 前缀用 Rust regex；捕获组替换用 `$1`/`${1}suffix`；不支持反向引用与 lookaround。
- 认证：重写**之后**才查 `~/.netrc`（Windows 用 `~/_netrc`），用镜像主机名；改主机会丢弃原主机凭据，可能改用 netrc。HTTPS→HTTP 且仍带凭据时 mise 拒绝请求。不要只在替换 URL 里写凭据。
