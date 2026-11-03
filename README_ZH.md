# RemoteDesktopMCP

[English](README.md)

- [1. Introduction](#1-introduction)
- [2. Quick Start](#2-quick-start)
- [3. Configuration](#3-configuration)
- [4. Optional Features](#4-optional-features)
- [5. Development](#5-development)
- [6. License](#6-license)

## 1. Introduction

最开始开发 RemoteDesktopMCP，是因为我想直接使用网页版 ChatGPT 完成一些本地工作，例如阅读项目代码、修改文档，或者执行终端命令。

ChatGPT 已经可以生成代码、分析问题，但它不能直接访问我电脑上的文件和开发环境。要让它真正参与这些工作，还需要一套能够在本机执行操作的工具。

原本准备自己实现，后来发现 [Desktop Commander](https://github.com/wonderwhy-er/DesktopCommander) 已经提供了文件读写、搜索和终端命令等 MCP 工具，没有必要重复开发。剩下的问题是：**怎样让网页版 ChatGPT 连接到这些运行在本地的工具？**

RemoteDesktopMCP 使用 OpenAI Secure MCP Tunnel 建立这条连接：本机主动连接 OpenAI，ChatGPT 再通过 Tunnel 调用本地的 Desktop Commander，无需将本地 MCP 服务端口暴露到公网，也不需要依赖 Desktop Commander 的第三方远程托管服务。

项目在此基础上补齐了 Windows、Linux 和 macOS 的安装、配置和服务管理。安装完成后，配置 Tunnel、启动服务并在 ChatGPT 注册插件，就可以直接从网页版 ChatGPT 操作本地文件和终端。

## 2. Quick Start

安装 RemoteDesktopMCP，将电脑连接到 ChatGPT，然后通过一次只读工具调用验证。Windows、Linux 和 macOS 共用同一客户端，可使用图形界面或命令行。

### 2.1. 准备环境

需要网络连接，以及支持自定义 MCP Tunnel 的 ChatGPT 账号或工作区。当前离线安装包支持 Windows x64、Linux x64 和 Intel macOS。

### 2.2. 安装

从 [最新 Release](https://github.com/ThinkerQAQ/remote-desktop-mcp/releases/latest) 下载对应安装包：

| 平台 | 安装包 |
| --- | --- |
| Windows x64 | `RemoteDesktopMCP-v*-windows-amd64.exe` |
| Linux x64 | `RemoteDesktopMCP-v*-linux-amd64.run` |
| macOS Intel | `RemoteDesktopMCP-v*-darwin-amd64.dmg` |

运行安装器。Windows 可通过开始菜单的 **Configure Tunnel** 打开配置界面。macOS 和 Linux 可在安装目录执行 `./bin/remotedesktopmcp gui`。没有桌面环境的机器直接使用 [CLI](#3-cli)。

### 2.3. 连接 ChatGPT

在 [OpenAI Tunnel 设置](https://platform.openai.com/settings/organization/tunnels)创建 Tunnel ID，再通过 [API Keys](https://platform.openai.com/settings/organization/api-keys) 创建 Runtime API Key。在客户端填写并保存配置，启动服务，确认本地 Tunnel 状态为 **Connected**。

随后打开 [ChatGPT Plugins](https://chatgpt.com/plugins)，使用相同的 Tunnel ID 注册自定义 MCP 插件并完成授权。具体步骤以 [OpenAI 连接指南](https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt) 为准。

在 ChatGPT 选择插件，调用只读工具 `list_sessions`。即使返回空列表，也说明工具调用成功。

### 2.4. 故障排查

Tunnel 未连接时，检查 ID、密钥、网络和服务状态。Tunnel 已连接但 ChatGPT 无法调用时，检查插件是否注册并在当前会话启用。不要公开密钥或含有私人信息的日志。

## 3. CLI

没有桌面或浏览器时，直接使用命令行。GUI 和 CLI 共用配置文件与运行时，不需要 PowerShell、Bash 配置向导。

### 3.1. 纯命令行安装

Qt Installer Framework 支持通过 `--accept-licenses --default-answer --confirm-command install` 无界面安装。Linux 服务器可使用：

```bash
chmod +x ./RemoteDesktopMCP-v*-linux-amd64.run
QT_QPA_PLATFORM=offscreen ./RemoteDesktopMCP-v*-linux-amd64.run --root "$HOME/RemoteDesktopMCP" --accept-licenses --default-answer --confirm-command install
```

Windows Server Core 可对下载的 `.exe` 安装器使用相同参数，并通过 `--root` 指定目录。macOS SSH 环境可先使用 `hdiutil` 挂载 `.dmg`，再对其中的安装程序使用相同参数。Windows Server Core 和 macOS SSH 的安装流程仍需实机验收，暂不视为已验证的发布能力。

### 3.2. 配置与服务管理

在安装目录执行：

```bash
./bin/remotedesktopmcp configure
./bin/remotedesktopmcp start
./bin/remotedesktopmcp status
./bin/remotedesktopmcp stop
```

Windows 使用 `bin\\remotedesktopmcp.exe`，子命令一致。交互式 `configure` 会隐藏输入的 Runtime API Key。自动化场景可使用 `configure --id <tunnel-id> --api-key-stdin`，通过标准输入传递密钥，避免写入命令参数。

服务能否自动恢复取决于平台和登录会话。退回普通后台进程时，重启后不会自动恢复；无需登录的系统服务还需要单独验收。

## 4. Optional Features

### 4.1. 连接本地 MCP 客户端

RemoteDesktopMCP 也支持不通过 Tunnel 的本地 stdio 连接。先按 [Development](#5-development) 安装源码依赖，再为 MCP 客户端配置 `scripts/proxy.mjs` 的绝对路径：

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

重新连接客户端，调用 `list_sessions` 验证。

## 5. Development

如果只是使用安装包，不需要本节。需要修改源码或运行测试时，准备 Git，以及符合 [package.json](package.json) 要求的 Node.js 和 npm：

```bash
git clone https://github.com/ThinkerQAQ/remote-desktop-mcp.git
cd remote-desktop-mcp
npm ci --no-audit --no-fund
npm run check
npm run smoke
npm run audit:high
```

`check` 运行单元与兼容性测试，`smoke` 初始化 MCP 并做一次只读调用。Windows PowerShell 遇到脚本执行策略限制时，可以使用 `npm.cmd`。

代码变更通过 PR Review 和 Squash Merge 合入。安装包与正式版本的构建流程分别见 [Installer CI](.github/workflows/offline-installers.yml) 和 [Release CI](.github/workflows/release.yml)。

## 6. License

原创代码使用 [Apache-2.0](LICENSE)，第三方依赖及许可见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

RemoteDesktopMCP 以运行它的操作系统账户权限读写文件和执行命令，不额外提供工具沙箱。使用时应控制账户和插件的权限范围。MCP 请求与结果可能发送给连接的 AI 服务；`config.toml`、`runtime/`、密钥和日志不要公开或提交到 Git。

如果发现安全问题，可以通过 [GitHub Security Advisories](https://github.com/ThinkerQAQ/remote-desktop-mcp/security/advisories) 私下报告。
