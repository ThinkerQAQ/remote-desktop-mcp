# RemoteDesktopMCP

[English](README.md)

- [1. 项目简介](#1-项目简介)
- [2. 快速开始：连接 ChatGPT](#2-快速开始连接-chatgpt)
- [3. 连接管理](#3-连接管理)
- [4. 其他 MCP 客户端](#4-其他-mcp-客户端)
- [5. 开发与测试](#5-开发与测试)
- [6. 许可与安全](#6-许可与安全)

## 1. 项目简介

RemoteDesktopMCP 通过 OpenAI Secure MCP Tunnel，让 ChatGPT 连接到你授权的电脑，调用 [Desktop Commander](https://github.com/wonderwhy-er/DesktopCommander) 提供的文件读写、搜索和终端命令工具。**不提供屏幕共享、鼠标或键盘控制。**

Windows、Linux 和 macOS 安装包已经内置 Node.js、项目依赖和 Tunnel Client。**通过 Release 安装不需要另外安装 Node.js、npm，也不需要 WSL。**

## 2. 快速开始：连接 ChatGPT

完整流程只有五步：**安装 → 配置 → 启动 → 注册插件 → 验收**。使用前确认你的 ChatGPT 账号或工作区支持自定义 MCP Tunnel 连接。

### 2.1. 下载安装

1. 打开 [最新 Release](https://github.com/ThinkerQAQ/remote-desktop-mcp/releases/latest)，根据系统下载**原生安装包**，不要下载源码压缩包。

   | 系统 | 安装包 |
   | --- | --- |
   | Windows x64 | `RemoteDesktopMCP-v*-windows-amd64.exe` |
   | Linux x64 | `RemoteDesktopMCP-v*-linux-amd64.run` |
   | macOS Intel | `RemoteDesktopMCP-v*-darwin-amd64.dmg` |

   这些安装包支持 **x64/Intel**，不适用于 ARM64 设备。

2. 运行安装包并选择固定的安装目录。Windows 直接打开 EXE；Linux 在下载目录执行 `chmod +x ./RemoteDesktopMCP-v*-linux-amd64.run`，然后运行该文件；macOS 打开 DMG 并启动安装程序。
3. 安装完成后，Windows 可以勾选 **Open RemoteDesktopMCP configuration**，自动打开配置窗口。之后也可以通过 **开始菜单 → RemoteDesktopMCP → Configure Tunnel** 打开。

这一流程**不需要下载源码、运行 `npm ci` 或注册浏览器扩展**。

### 2.2. 配置 Tunnel

1. 在 [OpenAI Tunnel 设置](https://platform.openai.com/settings/organization/tunnels)创建或选择自己的 **Tunnel ID**，再从 [API Keys](https://platform.openai.com/settings/organization/api-keys) 获取 **Runtime API Key**。前者标识连接，后者用于本地 Tunnel Client 身份验证；不要公开密钥。
2. **Windows：**在 **Configure Tunnel** 窗口填入 Tunnel ID 和 Runtime API Key，点击 **Save**。密钥会用圆点隐藏。下次打开时显示掩码表示本机已有保存的密钥，无须重复输入。**Save 只保存配置，不启动、停止或重启服务。**
3. 点击 **Start Service**，再点击 **Refresh Status**，确认出现 **Local Tunnel: Connected**。服务启动后，中间按钮会变成 **Stop Service**。
4. **Linux/macOS：**在安装目录打开终端，运行自带的 `Configure-RemoteDesktop.sh`；macOS 也可以使用 `Configure-RemoteDesktop.command` 在终端启动。根据提示输入 Tunnel ID 和运行密钥。这个终端向导会保存配置并启动当前用户的后台进程。**Linux/macOS 没有 Windows 的三按钮配置窗口。**

**注意：**本地显示 `Connected` 只说明 Tunnel 已经连接，不代表 ChatGPT 插件已注册。

### 2.3. 在 ChatGPT 注册插件并验收

1. 打开 [ChatGPT Plugins](https://chatgpt.com/plugins)。账号支持时，选择 **添加自定义 MCP 服务器 → Tunnel**，选择或输入自己的 Tunnel ID，完成授权和权限确认。若界面有所不同，以 [OpenAI 官方接入指南](https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt)为准。
2. 在 ChatGPT 对话中选择刚注册的插件，调用一次**只读**工具 `list_sessions`。
3. 工具成功返回即完成验收；刚安装的电脑返回空会话列表也属于正常情况。

**完成标准：**本地 Tunnel 已连接，且 ChatGPT 实际调用只读工具成功。电脑和本地服务必须保持运行，后续才能接收远程请求。

## 3. 连接管理

### 3.1. Windows 配置窗口

从 **开始菜单 → RemoteDesktopMCP → Configure Tunnel** 打开，或在安装目录运行 `bin/RemoteDesktopMCP-Configure.exe`。

| 操作 | 实际效果 |
| --- | --- |
| **Save** | 校验并保存 Tunnel ID/密钥，不影响正在运行的服务 |
| **Start Service / Stop Service** | 启动或停止已保存配置的服务 |
| **Refresh Status** | 只读取最新连接状态，不修改配置或服务 |
| **Auto-start at Windows sign-in** | 开启/关闭当前用户的登录自启动；修改开关不会主动停止当前连接 |
| **Open ChatGPT Plugins** | 跳转到 `https://chatgpt.com/plugins` |

**运行中修改了 Tunnel ID 或密钥：**先点击 **Save**，再点击 **Stop Service → Start Service**，让新配置生效。不要同时运行两个使用同一 Tunnel ID 的实例。

需要修改或卸载应用时，打开 **开始菜单 → RemoteDesktopMCP → Manage RemoteDesktopMCP**。卸载或迁移安装目录前先停止服务，并备份私有配置。

### 3.2. Linux/macOS 常用命令

在**安装目录**执行以下命令，直接使用安装包内置的 Node.js：

```bash
./bin/node ./scripts/runtime.mjs status
./bin/node ./scripts/runtime.mjs stop
./bin/node ./scripts/runtime.mjs start
```

按需执行对应操作，不必将三条命令依次执行。要修改 Tunnel ID 或密钥，重新运行 `./Configure-RemoteDesktop.sh`；macOS 也可以用 `./Configure-RemoteDesktop.command`。注意：与 Windows 的 Save 不同，**终端向导同时会启动服务**。

后台运行方式：Windows 在开启登录自启动时使用**当前用户计划任务**；macOS 使用 LaunchAgent；Linux 优先使用用户级 systemd，否则使用普通后台进程。Linux 后台回退模式不保证注销或重启后自动恢复。这里运行的不是具有系统管理员权限的 Windows 系统服务。

### 3.3. 常见问题

- **本地 Connected，但 ChatGPT 仍找不到插件：**检查 [ChatGPT Plugins](https://chatgpt.com/plugins) 中注册的 Tunnel ID 是否一致、账号授权是否完成，以及当前对话是否选择了插件。本地绿色状态不能代替插件验收。
- **Save 后还是旧连接：**这是预期行为。Save 不会打断正在运行的连接。点击 Stop Service，再点击 Start Service 应用新配置。
- **Tunnel 无法连接：**检查 Tunnel ID、运行密钥、网络，然后点击 Refresh Status。必要时仅在本机查看私有的 `runtime/tunnel.log`，不要公开原始日志。
- **登录 Windows 后服务没有自动启动：**检查 **Auto-start at Windows sign-in** 是否勾选；Linux/macOS 则检查当前用户的服务管理器。
- **工具操作的是 WSL 或另一台电脑：**检查 ChatGPT 实际连接的是哪一套 Tunnel、哪台设备，以及运行服务的操作系统账户。Windows 原生安装无需 WSL。

仍有问题可提交 [Issue](https://github.com/ThinkerQAQ/remote-desktop-mcp/issues)，仅附脱敏信息，不上传凭据、私人文件或完整终端输出。

## 4. 其他 MCP 客户端

如果只在**本地 MCP 客户端**中使用 stdio 模式，可以直接从源码运行，无需 Tunnel ID 或 Runtime API Key。按[第 5 节](#5-开发与测试)安装开发依赖，然后在客户端的 MCP 服务器配置中，填写源码目录下 `scripts/proxy.mjs` 的**绝对路径**：

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

具体配置入口取决于客户端。重新连接后，调用一次只读的 `list_sessions` 验证。**本地 stdio 成功，不代表 ChatGPT Tunnel 已连接。**

## 5. 开发与测试

从源码开发需要 Git、满足 [package.json](package.json) 要求的 Node.js 和 npm；**通过打包安装的用户不需要这些开发依赖**。

```bash
git clone https://github.com/ThinkerQAQ/remote-desktop-mcp.git
cd remote-desktop-mcp
npm ci --no-audit --no-fund
npm run check
npm run smoke
npm run audit:high
```

Windows PowerShell 如遇执行策略限制，将 `npm` 替换为 `npm.cmd`。`check` 验证兼容性及单元测试；`smoke` 初始化 MCP、发现工具并进行一次只读调用。修改代码通过 PR Review 和 Squash Merge 合入。三平台安装包构建见 [.github/workflows/offline-installers.yml](.github/workflows/offline-installers.yml)，带标签的正式发布见 [.github/workflows/release.yml](.github/workflows/release.yml)。

## 6. 许可与安全

项目原创代码采用 [Apache-2.0](LICENSE)，第三方依赖及授权见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

服务以**运行它的操作系统用户权限**读写文件、执行命令，**不是沙箱，也不提供工具级白名单**。建议使用最小权限账户，并认真审核插件权限；MCP 请求及返回内容可能传输到所连接的 AI 服务。

保持 `config.toml`、`runtime/`、API Key、日志和个人文件私有，不要提交 Git 或公开粘贴。安全问题请使用 [GitHub 私密漏洞报告](https://github.com/ThinkerQAQ/remote-desktop-mcp/security/advisories)。
