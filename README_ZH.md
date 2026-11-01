# Remote Desktop MCP (DV)

[English](README.md)

- [1. Introduction](#1-introduction)
- [2. Quick Start](#2-quick-start)
- [3. Configuration](#3-configuration)
- [4. Optional Features](#4-optional-features)
- [5. Development](#5-development)
- [6. License](#6-license)

## 1. Introduction

有时我们希望 AI 助手直接查看电脑上的项目代码、搜索文件，或者帮忙运行命令。但只在聊天窗口里描述问题，AI 并不能访问本机工程，也无法知道命令在实际环境中的执行结果。

Remote Desktop MCP 通过 [Desktop Commander](https://github.com/wonderwhy-er/DesktopCommander)，让支持 MCP 的 AI 助手使用你授权电脑上的文件和终端。你可以在本地 MCP 客户端中使用，也可以在账户支持的情况下通过 Secure MCP Tunnel 从 ChatGPT 连接。

本项目负责连接、安装和后台运行；文件读取、修改、搜索与终端操作由 Desktop Commander 提供。**它不提供桌面画面共享、鼠标控制或图形化远程桌面功能。**

## 2. Quick Start

先完成本地 MCP 连接：安装程序、配置客户端，再调用一次只读工具，确认整条链路可用。此流程不需要 OpenAI 账号、Tunnel 或 API Key。需要从 ChatGPT 远程连接时，再按 [Case 1](#41-case-1通过-tunnel-连接-chatgpt) 操作。

### 2.1. 准备运行环境

需要 Windows（原生 PowerShell）、Linux 或 macOS，以及 Node.js 和 npm。Node.js 版本须满足 [package.json](package.json) 的要求（当前最低 22.12）；Windows **不需要 WSL**。首次安装需要连接 npm 仓库。

在终端检查 Node 和 npm：

```powershell
# Windows PowerShell
node --version
npm.cmd --version
```

```bash
# Linux / macOS
node --version
npm --version
```

未安装 Node 时先安装符合要求的版本。后面的[远程安装向导](#41-case-1通过-tunnel-连接-chatgpt)也可以按需安装兼容的 Node 运行环境。

### 2.2. 下载与安装

1. 打开[最新 Release](https://github.com/ThinkerQAQ/remote-desktop-mcp/releases/latest)，根据操作系统选择文件名以 `-windows.zip`、`-linux.tar.gz` 或 `-macos.tar.gz` 结尾的压缩包。这些压缩包包含 **Node.js 项目源码与启动脚本**，不是免安装的原生可执行程序；系统后缀用于区分对应的安装入口。
2. 同时下载该 Release 的 `SHA256SUMS`，解压前核对**对应文件名**的 SHA-256。Windows 在下载目录执行 `Get-FileHash .\*.zip -Algorithm SHA256`；Linux 执行 `sha256sum ./*.tar.gz`；macOS 执行 `shasum -a 256 ./*.tar.gz`。计算结果与校验文件不一致时，不要继续安装。
3. 将压缩包**完整解压**到固定目录，在包含 `package.json` 和 `scripts/proxy.mjs` 的解压目录打开终端。配置 MCP 客户端后不要随意移动目录，因为客户端会使用它的绝对路径。
4. 安装锁定的依赖并验证 MCP 服务。

**Windows PowerShell**（将示例路径替换为自己的解压目录）：

```powershell
Set-Location 'C:\path\to\remote-desktop-mcp'
npm.cmd ci --no-audit --no-fund
npm.cmd run smoke
```

**Linux / macOS**（替换为实际目录）：

```bash
cd '/path/to/remote-desktop-mcp'
npm ci --no-audit --no-fund
npm run smoke
```

`npm ci` 会自动给本地安装的 Desktop Commander 应用仓库维护的兼容性补丁。`smoke` 成功后，应输出包含 `"initialized":true`、`"readonly_tool_succeeded":true` 的 JSON，并以退出码 0 结束。测试会真正调用只读的 `list_sessions`，但不会打印会话数据。

### 2.3. 连接本地 MCP 客户端

在**本地 MCP 客户端**的服务器设置中添加以下 stdio 配置，将示例路径替换为刚才安装目录下 `scripts/proxy.mjs` 的**绝对路径**：

```json
{
  "mcpServers": {
    "desktop": {
      "command": "node",
      "args": ["/absolute/path/remote-desktop-mcp/scripts/proxy.mjs"]
    }
  }
}
```

Windows 路径可以写成 `C:/tools/remote-desktop-mcp/scripts/proxy.mjs`。以上是常见 MCP 客户端的配置格式，具体设置位置以使用的客户端为准。如果图形客户端找不到 `node`，将 `command` 换成 Node 可执行文件的绝对路径。

保存后，**重新连接或重启 MCP 客户端**。客户端会自行启动 stdio 进程，不需要另外运行一份 `npm run mcp`。

### 2.4. 完成第一次操作

1. 在已连接的 MCP 客户端中查看工具列表，找到 `list_sessions`。
2. 调用 `list_sessions`，不需要传参数。
3. 确认工具调用成功。新电脑上返回空会话列表也是正常结果。

至此，MCP 客户端、适配器和 Desktop Commander 的本地调用链路已经打通。前面的 `npm run smoke` 是不依赖客户端配置的独立验收；**这两项都不能代替远程 ChatGPT Tunnel 的验收**。

### 2.5. 常见问题

- **`npm ci` 失败：**检查 Node 版本、npm 网络和当前目录中的 `package-lock.json`。应使用 `npm ci` 安装锁定依赖，不要随意改用 `npm install`。
- **客户端找不到 Node 或服务：**检查 `command`、`args` 的绝对路径；图形客户端的 PATH 可能与终端不同。在安装目录重新运行 `npm run smoke` 定位问题。
- **客户端看不到工具或 stdio 报错：**重新连接客户端并检查 MCP 日志。stdout 专供 JSON-RPC 协议，不应写入普通调试日志。
- **文件路径指向了另一套系统或 WSL：**检查客户端实际运行的 Node 程序和 `proxy.mjs` 路径；服务操作的是**该进程所在系统**的文件。
- **安装目录移动后无法连接：**更新客户端中的绝对路径。如果配置过 Tunnel，还需要在新目录重新执行[远程安装向导](#41-case-1通过-tunnel-连接-chatgpt)。

仍无法解决时，可[提交 Issue](https://github.com/ThinkerQAQ/remote-desktop-mcp/issues)，附上脱敏错误信息，不要公开凭据、文件内容和终端历史。

## 3. Configuration

本地 stdio 模式**无需创建** `config.toml`；默认配置以 [config.example.toml](config.example.toml) 为准。

如果需要覆盖设置，在 `package.json` 同级创建私有 `config.toml`，例如：

```toml
[mcp]
filter_log_notifications = true
```

这个选项只过滤 Desktop Commander 发出的 *info/debug* 级 MCP 日志通知，不会过滤 warning/error，也**不会脱敏工具返回的文件或命令输出**。

远程向导会创建自己的私有 `config.toml` 和 `runtime/` 文件。其中 `[tunnel].id` 是你自己账号的 Tunnel ID，`api_key_env` 指定 Tunnel 进程读取密钥的环境变量名。运行密钥由向导单独保存，不会写入生成的 Tunnel YAML。配置文件均已被 Git 忽略，不要将其上传到 Issue 或 PR。

## 4. Optional Features

### 4.1. Case 1：通过 Tunnel 连接 ChatGPT

此功能要求你的 ChatGPT 账号或工作区**支持通过 Secure MCP Tunnel 接入自定义 MCP 服务**。先阅读[官方连接指南](https://help.openai.com/zh-hans-cn/articles/12584461-connecting-custom-mcp-servers-in-chatgpt)。ChatGPT 无法直接启动本地 stdio 进程，因此远程使用需要 Tunnel。

1. **准备自己的账号信息。** 在 [OpenAI Tunnel 设置](https://platform.openai.com/settings/organization/tunnels)中取得 Tunnel ID，并在 [API Keys](https://platform.openai.com/settings/organization/api-keys) 中准备运行密钥。安装程序**不会替你创建**这些账户资源。**不要把 ID 和密钥粘贴到聊天或提交到 Git。**
2. **从已解压的安装目录运行安装向导。** 向导会安装缺少的受支持工具（包括需要时单独安装官方 tunnel-client）、检查本地 MCP、询问 Tunnel ID 并隐藏输入运行密钥，然后配置当前用户的后台运行方式。

**Windows PowerShell：**

```powershell
Set-Location 'C:\path\to\remote-desktop-mcp'
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\setup.ps1
```

**Linux / macOS：**

```bash
cd '/path/to/remote-desktop-mcp'
bash setup.sh
```

3. **检查 Tunnel 运行状态。** 向导验证成功后会报告 `local_mcp: passed` 和 `tunnel_ready: true`。还可以在同一目录运行：

```powershell
# Windows
npm.cmd run status
```

```bash
# Linux / macOS
npm run status
```

确认 `"managed_process_running":true` 和 `"tunnel_ready":true`。**这仅代表本地进程和 Tunnel 就绪，并不等于 ChatGPT 已完成连接。**

4. **在 ChatGPT 中添加 MCP 连接。** 账号支持时，进入**插件（Plugins）→ 添加自定义 MCP 服务器（Add custom MCP server）**，选择 **Tunnel**，输入或选择自己的 Tunnel ID，完成权限与风险确认，再创建并安装连接。不同账号的界面可能不同，请以[官方说明](https://help.openai.com/zh-hans-cn/articles/12584461-connecting-custom-mcp-servers-in-chatgpt)为准。
5. **调用工具完成验收。** 新建聊天，选择已连接的插件，实际调用一次只读的 `list_sessions`。调用成功才说明远程 ChatGPT 已经连通；安装脚本不能替你完成账户授权。

**后台运行：**Windows 使用当前用户的计划任务，macOS 使用 LaunchAgent，Linux 优先使用用户 systemd，缺少时退化为普通后台进程。电脑关机后无法远程连接；Linux 退化模式在注销或重启后不会自动恢复。同一 Tunnel 不要同时启动两个运行实例。

### 4.2. Case 2：管理已经配置的 Tunnel

在安装目录使用以下命令，Windows 将 `npm` 换成 `npm.cmd`：

```bash
npm run status
npm run stop
npm start
```

`status` 查看进程和 Tunnel 状态；`stop` 停止托管进程；`start` 使用保存的配置重新启动。**只执行需要的命令**，不必按顺序全部运行。重新执行 `setup.ps1` 或 `setup.sh` 可以复用已有设置。移动安装目录前先停止进程，并在新位置重跑向导以更新绝对路径。

需要自定义 Linux 服务时，可以参考 [deploy/systemd.service.example](deploy/systemd.service.example) 模板并替换本机路径；默认推荐使用安装向导。

## 5. Development

源码开发需要 Git、符合 [package.json](package.json) 要求的 Node.js 和 npm。发行包包含相同的 JavaScript 工程，开发者也可以直接克隆：

```bash
git clone https://github.com/ThinkerQAQ/remote-desktop-mcp.git
cd remote-desktop-mcp
npm ci --no-audit --no-fund
npm run check
npm run smoke
npm run audit:high
```

Windows 原生 PowerShell 如遇 npm PowerShell 脚本执行限制，将 `npm` 改为 `npm.cmd`。`check` 验证上游兼容补丁和单元测试；`smoke` 真正启动本地 MCP、发现工具，并完成一次只读调用。CI 覆盖 Windows、Linux、macOS 的 Node 22/24，并使用**模拟凭据**测试原生安装流程。CI 通过不代表真实 Tunnel 账号授权或登录后自动启动已完成验收。

本仓库通过依赖安装 Desktop Commander，并在安装完成后执行经过审核的兼容补丁，不复制其源码。代码变更使用功能分支、PR Review 与 Squash Merge。

## 6. License

项目原创的适配器和安装代码采用 [Apache-2.0](LICENSE)。Desktop Commander 采用 MIT；独立安装的 OpenAI tunnel-client 采用 Apache-2.0。依赖署名、上游修改和再分发要求见[第三方许可证声明](THIRD_PARTY_NOTICES.md)。用户文件和第三方作品不属于本项目源码许可范围。

**安全说明：**本项目以**运行进程的操作系统账户权限**暴露 Desktop Commander 的文件与 Shell 工具，不提供额外的工具白名单、授权边界、命令沙箱或图形屏幕隔离。建议使用专门的低权限账户、隔离设备或容器运行。MCP 请求和结果可能传输给连接的 AI 服务；Desktop Commander 自身的遥测与历史行为由上游配置决定。

不要将私有 `config.toml`、`runtime/`、凭据、日志和用户文件提交到 Git；本地 Tunnel 的健康与管理端口不能暴露到公网。通过官方 Tunnel 和账户权限管理远程连接。Unix 私有文件及目录使用受限权限，Windows 安装将访问权限限制在当前用户。发布前仍需检查暂存差异，因为 .gitignore 无法消除历史提交中的泄露。

安全漏洞请通过可用的 [GitHub 私密漏洞报告](https://github.com/ThinkerQAQ/remote-desktop-mcp/security/advisories) 或邮件 **contact@thinkerqaq.com** 私下反馈，不要在公开 Issue 中提交有效凭据或私人命令输出。
