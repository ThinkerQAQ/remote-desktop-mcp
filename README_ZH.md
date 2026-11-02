# RemoteDesktopMCP

[English](README.md)

- [1. Introduction](#1-introduction)
- [2. Quick Start](#2-quick-start)
- [3. Configuration](#3-configuration)
- [4. Optional Features](#4-optional-features)
- [5. Development](#5-development)
- [6. License](#6-license)

## 1. Introduction

RemoteDesktopMCP 通过 OpenAI Secure MCP Tunnel，让 ChatGPT 使用你授权电脑上的文件搜索、修改和终端命令工具。工具能力由 [Desktop Commander](https://github.com/wonderwhy-er/DesktopCommander) 提供。

Windows、Linux、macOS 安装包已内置 Node.js、项目依赖和 Tunnel Client。**普通用户安装发行包不需要额外安装 Node.js、npm 或 WSL。** 本项目不提供屏幕共享、鼠标或键盘的图形远控能力。

## 2. Quick Start

从安装 RemoteDesktopMCP 开始，到 ChatGPT 成功调用一次只读工具为止。

### 2.1. 准备环境

- Windows x64、Linux x64 或 macOS Intel（x64）。当前这些安装包不支持 ARM64。
- 能联网，且 ChatGPT 账号或工作区支持自定义 MCP Tunnel 连接。
- OpenAI Tunnel ID 和 Runtime API Key，可以在 [2.3](#23-配置并启动-tunnel) 过程中创建。

### 2.2. 下载安装

1. 打开 [最新 Release](https://github.com/ThinkerQAQ/remote-desktop-mcp/releases/latest)，在 **Assets** 中按系统选择**原生安装包**：

   | 平台 | 安装文件名 |
   | --- | --- |
   | Windows x64 | `RemoteDesktopMCP-v*-windows-amd64.exe` |
   | Linux x64 | `RemoteDesktopMCP-v*-linux-amd64.run` |
   | macOS Intel | `RemoteDesktopMCP-v*-darwin-amd64.dmg` |

2. 运行安装包，选择一个固定安装目录：
   - **Windows：**双击下载的 `.exe`。
   - **macOS：**打开 `.dmg`，运行其中的安装程序。
   - **Linux：**在下载目录将安装文件重命名为 `RemoteDesktopMCP-Setup.run`，然后执行：

   ```bash
   chmod +x RemoteDesktopMCP-Setup.run
   ./RemoteDesktopMCP-Setup.run
   ```

3. 完成安装。Windows 建议勾选 **Open RemoteDesktopMCP configuration** 直接打开配置窗口。以后可从 **开始菜单 → RemoteDesktopMCP → Configure Tunnel** 再次进入。

安装包已经包含运行环境，**无需下载源码压缩包或运行 `npm ci`**。

### 2.3. 配置并启动 Tunnel

1. 打开 [OpenAI Tunnel 设置](https://platform.openai.com/settings/organization/tunnels)，创建或选择自己的 **Tunnel ID**；再从 [OpenAI API Keys](https://platform.openai.com/settings/organization/api-keys) 获取 **Runtime API Key**。首次连接需要密钥，不要公开。
2. **Windows：**在 **Configure Tunnel** 窗口输入这两项，然后点击 **Save**。该按钮只校验并保存配置，**不会启动或停止服务**。以后再次打开时，已保存的密钥会以掩码显示，无须重复输入。
3. 点击 **Start Service**，然后点击 **Refresh Status**，确认界面显示 **Local Tunnel: Connected**。
4. **Linux/macOS：**在安装目录的终端执行 `./Configure-RemoteDesktop.sh`，根据提示输入 Tunnel ID 和密钥。macOS 也可以打开 `Configure-RemoteDesktop.command`，由 Terminal 执行。终端向导会保存配置并启动用户级后台服务。

**Local Tunnel: Connected 只代表本地 Tunnel 连接成功，不代表 ChatGPT 已注册插件。**

### 2.4. 在 ChatGPT 中验收

1. 打开 [ChatGPT Plugins](https://chatgpt.com/plugins)，添加 **自定义 MCP 服务器 → Tunnel**，选择或输入与本地一致的 Tunnel ID，完成授权。若界面不同，以 [OpenAI 官方接入指南](https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt)为准。
2. 在 ChatGPT 对话中选择刚安装的插件，实际调用一次**只读** `list_sessions` 工具，无须参数。
3. **预期结果：**工具调用成功。新电脑没有会话时，返回空列表也算成功。

**完成标准：**本地显示 `Connected`，且 ChatGPT 的只读工具调用成功。之后电脑和服务需要保持运行，才能继续接受远程请求。

### 2.5. 常见问题

- **Tunnel 未连接：**检查 Tunnel ID、Runtime API Key 和网络，然后刷新状态。只在本机检查日志，不要上传凭据。
- **ChatGPT 看不到插件：**确认 ChatGPT 注册的 Tunnel ID 与本地一致、账号授权完成，并在对话中选择了插件。
- **Save 后仍是旧连接：**Save 不会打断现有服务。依次点击 **Stop Service → Start Service** 应用新配置。
- **操作到了 WSL 或另一台电脑：**核对 ChatGPT 注册的 Tunnel，以及实际运行服务的电脑和操作系统账户。Windows 原生安装不依赖 WSL。

仍无法解决时，请提交 [Issue](https://github.com/ThinkerQAQ/remote-desktop-mcp/issues)，只附脱敏信息，不要包含真实密钥或私人命令输出。

## 3. Configuration

Windows 的主要配置入口是 **开始菜单 → RemoteDesktopMCP → Configure Tunnel**，也可在安装目录运行 `bin/RemoteDesktopMCP-Configure.exe`。

| 控件 | 实际效果 |
| --- | --- |
| **Save** | 校验并保存 Tunnel ID 和密钥，不启动或停止服务 |
| **Start Service / Stop Service** | 使用已保存配置启动服务，或停止当前服务 |
| **Refresh Status** | 只刷新状态，不修改配置 |
| **Auto-start at Windows sign-in** | 启用或禁用当前用户登录后的自启动任务；切换开关不会主动停止当前连接 |
| **Open ChatGPT Plugins** | 打开 [ChatGPT 插件页面](https://chatgpt.com/plugins) |

运行中修改配置后，按 **Save → Stop Service → Start Service** 应用。**不要同时运行两个使用相同 Tunnel ID 的实例。**

私有的 `config.toml` 和 `runtime/` 保存在安装目录中，不要上传到 GitHub。修改配置或卸载时，可使用 **开始菜单 → RemoteDesktopMCP → Manage RemoteDesktopMCP**。卸载或迁移目录前先停止服务并备份配置。

## 4. Optional Features

### 4.1. Case 1：通过命令行管理服务

Linux/macOS 在**安装目录**执行以下命令，使用发行包内置的 Node.js：

```bash
./bin/node ./scripts/runtime.mjs status
./bin/node ./scripts/runtime.mjs stop
./bin/node ./scripts/runtime.mjs start
```

**按需要执行其中一条命令即可**，不是要求依次运行。修改配置可重新运行 `./Configure-RemoteDesktop.sh`；macOS 还可使用 `./Configure-RemoteDesktop.command`。注意：与 Windows 的 **Save** 不同，终端向导也会启动服务。

Windows 开启登录自启动后使用**当前用户的计划任务**；macOS 使用用户级 LaunchAgent；Linux 优先使用用户级 systemd，否则使用普通后台进程。Linux 的后台回退模式不会在注销或重启后自动恢复。

### 4.2. Case 2：连接本地 MCP 客户端

如果使用的是本地 stdio MCP 客户端，**不需要 Tunnel ID 或 Runtime API Key**。按[第 5 节](#5-development)准备源码与依赖，再在客户端 MCP 设置里填写 `scripts/proxy.mjs` 的绝对路径：

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

保存配置、重新连接客户端，再调用只读的 `list_sessions` 验证。不同客户端的 MCP 配置入口可能不同。**本地 stdio 验收不代表远程 ChatGPT Tunnel 已连接。**

## 5. Development

源码开发需要 Git、npm 和满足 [package.json](package.json) 要求的 Node.js；**发行包用户不需要安装开发依赖**。

```bash
git clone https://github.com/ThinkerQAQ/remote-desktop-mcp.git
cd remote-desktop-mcp
npm ci --no-audit --no-fund
npm run check
npm run smoke
npm run audit:high
```

Windows PowerShell 遇到脚本执行策略限制时，将 `npm` 改为 `npm.cmd`。`check` 运行兼容性与单元测试；`smoke` 发现 MCP 工具并执行一次只读调用。代码变更通过 PR Review 和 Squash Merge。构建流程分别见[三平台安装器 CI](.github/workflows/offline-installers.yml)与[正式 Release CI](.github/workflows/release.yml)。

## 6. License

项目原创代码使用 [Apache-2.0](LICENSE)，第三方依赖及许可见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

**安全说明：**服务以运行它的操作系统账户权限执行文件操作和终端命令，**不提供额外沙箱或工具白名单**。建议使用最小权限账户，审核 ChatGPT 插件授权范围。MCP 请求与结果可能传输给连接的 AI 服务。不要公开 `runtime/`、`config.toml`、密钥或日志。

安全漏洞请使用 [GitHub 私密安全报告](https://github.com/ThinkerQAQ/remote-desktop-mcp/security/advisories)。
