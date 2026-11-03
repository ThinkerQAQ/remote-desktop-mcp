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

接下来从安装开始，把电脑连接到 ChatGPT，并通过一次实际的工具调用确认整个流程可用。Windows 主要通过图形界面操作，Linux 和 macOS 则使用安装包自带的终端向导。

### 2.1. 准备环境

准备一台可以联网的电脑，以及支持自定义 MCP Tunnel 的 ChatGPT 账号或工作区。目前安装包支持 Windows x64、Linux x64 和 macOS Intel，暂不支持 ARM64。

Tunnel ID 和 Runtime API Key 可以安装完成后再创建，不需要提前修改配置文件。

### 2.2. 下载安装

打开 [GitHub Latest Release](https://github.com/ThinkerQAQ/remote-desktop-mcp/releases/latest)，从 Assets 中下载对应系统的安装包：

| 系统 | 安装包 |
| --- | --- |
| Windows x64 | `RemoteDesktopMCP-v*-windows-amd64.exe` |
| Linux x64 | `RemoteDesktopMCP-v*-linux-amd64.run` |
| macOS Intel | `RemoteDesktopMCP-v*-darwin-amd64.dmg` |

Windows 直接运行 EXE 并选择安装目录。macOS 打开 DMG，运行其中的安装程序。Linux 下载后，在终端进入下载目录并执行：

```bash
chmod +x ./RemoteDesktopMCP-v*-linux-amd64.run
./RemoteDesktopMCP-v*-linux-amd64.run
```

安装完成时勾选 **Open RemoteDesktopMCP configuration**，就会在浏览器打开配置页面。之后可以从 Windows 开始菜单、macOS 应用或 Linux 应用菜单再次打开。

### 2.3. 配置并启动 Tunnel

程序安装好了，接下来需要建立本机与 ChatGPT 之间的连接。

先从 [OpenAI Tunnel 设置](https://platform.openai.com/settings/organization/tunnels)创建 Tunnel，取得 **Tunnel ID**；再到 [API Keys](https://platform.openai.com/settings/organization/api-keys) 创建 **Runtime API Key**。两者分别用于标识连接和验证本机客户端。

打开 **Configure Tunnel** 页面，按顺序操作：

1. 填入 Tunnel ID 和 Runtime API Key，点击 **Save**，把配置保存到本机。
2. 点击 **Start Service**，启动 Tunnel 服务。
3. 点击 **Refresh Status**，确认状态为 **Local Tunnel: Connected**。

重新打开配置窗口时，已保存的密钥会以掩码显示。

### 2.4. 在 ChatGPT 中验收

本机显示 Connected，说明 Tunnel 已连接。最后还需要告诉 ChatGPT 使用哪个 MCP 插件。

打开 [ChatGPT Plugins](https://chatgpt.com/plugins)，添加自定义 MCP 服务，选择 **Tunnel** 并关联刚才的 Tunnel ID，完成授权。具体入口如果有变化，可以参考 [OpenAI 接入说明](https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt)。

随后在 ChatGPT 对话中选择该插件，尝试调用一次只读的 `list_sessions`。只要工具能够正常返回，就说明 ChatGPT 已经可以访问本机 MCP。新安装的环境可能返回空会话列表，这是正常的。

之后使用时，保持电脑和 Tunnel 服务运行即可。

### 2.5. 常见问题

**Tunnel 一直没有连接成功。** 检查 Tunnel ID、密钥和网络，再刷新状态。仍然失败可以查看本地日志，但不要公开密钥。

**本机 Connected，ChatGPT 却调用不了工具。** 检查插件有没有注册成功、Tunnel ID 是否一致，以及当前对话是否选中了该插件。这和本机连接成功是两个不同的环节。

**修改了配置，仍然使用旧连接。** Save 只负责保存。要让新配置生效，依次点击 **Stop Service → Start Service**。

如果工具操作到了 WSL 或另一台电脑，检查实际注册的 Tunnel 和运行服务的设备，不要同时使用同一个 Tunnel ID 启动多个实例。问题仍然存在，可以在 [Issues](https://github.com/ThinkerQAQ/remote-desktop-mcp/issues) 提供脱敏后的复现信息。

## 3. Configuration

三个平台使用同一套配置页面，也可以在这里管理服务。各个按钮的用途如下：

| 操作 | 作用 |
| --- | --- |
| **Save** | 保存 Tunnel ID 和密钥，不改变服务状态 |
| **Start Service / Stop Service** | 启动或停止本机服务 |
| **Refresh Status** | 只读取最新状态 |
| **Auto-start when I sign in** | 控制当前用户登录后是否自动启动，不影响当前连接 |
| **Open ChatGPT Plugins** | 打开 [ChatGPT 插件页面](https://chatgpt.com/plugins) |

比如需要更换 Tunnel ID，可以先修改并 Save；如果服务正在运行，再 Stop、Start 一次即可。自动启动是独立设置，关闭它不会马上停止服务。

配置保存在安装目录下的 `config.toml` 和 `runtime/`，包含本机认证信息。迁移或卸载前先停止服务，并备份这些文件。Windows 可以从开始菜单的 **RemoteDesktopMCP → Manage RemoteDesktopMCP** 进入维护和卸载界面。

## 4. Optional Features

### 4.1. Case 1：通过命令行管理服务

除了图形界面，也可以在安装目录通过终端配置 Tunnel：Linux/macOS 运行 `./bin/node ./scripts/cli-config.mjs`，Windows PowerShell 运行 `.\bin\node.exe .\scripts\cli-config.mjs`。终端向导会提示输入 Tunnel ID 和密钥。

需要管理服务时，Linux/macOS 使用以下命令：

```bash
# 查看状态
./bin/node ./scripts/runtime.mjs status

# 停止服务
./bin/node ./scripts/runtime.mjs stop

# 启动服务
./bin/node ./scripts/runtime.mjs start
```

Windows 将 `./bin/node` 替换成 `./bin/node.exe` 即可。登录自启动可以通过 `./bin/node ./scripts/runtime.mjs autostart enable` 开启，改为 `disable` 关闭，使用 `status` 查询。Linux/macOS 仍可运行 `./Configure-RemoteDesktop.sh` 完成命令行配置。

后台服务由当前用户管理：Windows 的登录自启动使用计划任务，macOS 使用 LaunchAgent，Linux 优先使用用户级 systemd。Linux 在没有 systemd 时会退回普通后台进程，注销或重启后需要手动启动。

### 4.2. Case 2：接入本地 MCP 客户端

除了连接网页版 ChatGPT，本项目也保留了本地 stdio 接入方式。使用支持 stdio 的 MCP 客户端时，可以直接启动 `scripts/proxy.mjs`，不需要配置 Tunnel。

先按 [Development](#5-development) 准备源码和依赖，再在客户端中配置：

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

将示例路径替换成实际的绝对路径，重新连接客户端后，可同样调用 `list_sessions` 验证。本地 stdio 与前面的 ChatGPT Tunnel 是两种独立的接入方式。

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
