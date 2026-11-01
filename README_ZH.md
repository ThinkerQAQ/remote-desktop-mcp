# Remote Desktop MCP (DV)

[English](README.md)

## 项目简介

通过 Desktop Commander，让 MCP 客户端使用本机文件、终端会话和搜索工具。本项目提供持久 stdio 适配器、安装向导与可选 OpenAI Tunnel，适合让 AI 助手协助本机开发的用户。工具由 Desktop Commander 提供，本项目不提供桌面画面控制引擎。

## 快速开始

### 1. 前置条件

Windows PowerShell、Linux 或 macOS；Node.js **22.12+**、npm 和 Git。Windows 原生运行，不要求 WSL。首次安装需要访问 npm。使用本地 stdio 不需要浏览器调试、Tunnel 或凭据。

### 2. 安装

```sh
git clone https://github.com/ThinkerQAQ/remote-desktop-mcp.git
cd remote-desktop-mcp
npm ci
npm run check
```

### 3. 配置并启动 MCP 客户端

默认配置即可运行，无需创建 `config.toml`。在支持本地 stdio MCP 的客户端中添加服务器，将绝对路径替换为实际位置。Windows 可写成 `C:/tools/remote-desktop-mcp/scripts/proxy.mjs`。以下是常见客户端配置格式，填入所用客户端的 MCP 服务器设置。

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

重新连接或重启客户端，由客户端启动服务进程，不需要在同一客户端终端额外运行 `npm run mcp`。排查协议问题时，`npm run mcp` 可单独启动同一个 stdio 服务并等待 MCP 消息。

### 4. 完成一次操作

让客户端调用 `list_sessions`。验收标准：工具列表中存在该工具，调用返回有效结果；新机器返回空会话列表也是正常结果。这覆盖客户端 → 适配器 → Desktop Commander 的完整链路，无需读取文件或执行命令。

也可以在仓库中独立验证本地协议流程：

```sh
npm run smoke
```

该检查必须完成初始化、工具发现和真实 `list_sessions` 调用，并以退出码 0 结束。它不代表远程 ChatGPT 连接已经验收。

### 5. 常见问题

- **客户端找不到 Node：**将 `command` 改为 Node 可执行文件的绝对路径；图形客户端的 PATH 可能不同。
- **没有工具或 stdio 出错：**重跑 `npm ci`、`npm run check`、`npm run smoke`，检查 stderr，不要向协议 stdout 输出日志。
- **Tunnel 就绪但没有工具：**刷新已注册的 MCP 连接并新建聊天，实际调用 `list_sessions`；仅看 Tunnel 状态不够。
- **移动目录后无法启动：**在固定目录重跑安装向导，重新生成启动路径。同一 Tunnel 不要启动两个 runtime。

## 配置说明

可选覆盖配置写入仓库中被 Git 忽略的 `config.toml`，以 [config.example.toml](config.example.toml) 为准。本地 stdio 没有必填配置。

```toml
[mcp]
filter_log_notifications = true
```

远程连接使用自己的 `[tunnel].id`；`api_key_env` 默认 `OPENAI_API_KEY`，`health_port` 默认 `18832`。生成的 Tunnel YAML 引用环境变量，不内嵌密钥。向导负责私有凭据存储，不要将密钥放入 Git 或聊天。

## 可选功能

### 持久远程连接

本地 stdio 是最短路径。如果从其他机器上的 ChatGPT 连接，还需要自己的 OpenAI Tunnel / 工作区权限及 runtime 凭据。在仓库目录运行：

```sh
# Linux / macOS
bash setup.sh
```

```powershell
# Windows 原生 PowerShell
.\setup.ps1
```

向导安装缺失的受支持依赖，隐藏输入 runtime 密钥，保存自己的 Tunnel ID、配置持久启动，并显示注册步骤。按账户支持情况，在 ChatGPT 完成「Add custom MCP server → Tunnel」，启用连接、新建聊天并调用 `list_sessions`。该调用成功才算远程接入验收完成；安装程序不能代替账户授权。

Linux 优先使用用户 systemd，否则后台运行；macOS 使用用户 LaunchAgent；Windows 使用用户 Scheduled Task。Unix 引导安装需要 curl/tar，安装基础依赖可能需要包管理权限。这些服务不能保证关机时可用。

自定义 Linux 服务部署可使用 [deploy/systemd.service.example](deploy/systemd.service.example) 机器可读模板，需在本地替换所有绝对路径。默认仍使用向导安装。

配置后，在仓库目录运行 `npm run status`、`npm start`、`npm stop` 查看或管理进程。重跑向导会复用配置。官方 tunnel-client 单独安装，不复制其源码；升级需要主动更新源码或安装包。

## 开发与验证

CI 在 Linux、Windows、macOS 上覆盖 Node 22/24。

```sh
npm ci
npm run check
npm run smoke
npm run audit:high
```

`check` 执行上游兼容补丁与单元测试；`smoke` 验证真实本地 MCP。CI 使用模拟凭据检查原生安装，不代表你的远程账户授权或真实重启已经通过。上游仍可能存在中危依赖公告，高危和严重问题由检查阻止。使用功能分支、PR、Squash Merge，合并后删除分支。

## 许可证与合规

集成代码采用 [Apache-2.0](LICENSE)。Desktop Commander 采用 MIT；单独安装的 OpenAI tunnel-client 采用 Apache-2.0。分发时保留[第三方声明](THIRD_PARTY_NOTICES.md)。

适配器暴露上游文件和 Shell 工具，不提供操作系统沙箱或授权边界。请使用你愿意授权的系统账户运行。工具请求与结果可能传到所连接的 AI 服务；上游遥测和设置仍由上游控制。源码许可不覆盖用户文件或凭据。详见[安全说明](SECURITY.md)与[中文版](SECURITY_ZH.md)。
