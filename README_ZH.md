# RemoteDesktopMCP

[English](README.md)

- [1. Introduction](#1-introduction)
- [2. Quick Start](#2-quick-start)
- [3. Development](#3-development)
- [4. License](#4-license)

## 1. Introduction

最开始开发 RemoteDesktopMCP，是因为我想直接使用网页版 ChatGPT 完成一些本地工作，例如阅读项目代码、修改文档，或者执行终端命令。

ChatGPT 已经可以生成代码、分析问题，但它不能直接访问我电脑上的文件和开发环境。要让它真正参与这些工作，还需要一套能够在本机执行操作的工具。

原本准备自己实现，后来发现 [Desktop Commander](https://github.com/wonderwhy-er/DesktopCommander) 已经提供了文件读写、搜索和终端命令等 MCP 工具，没有必要重复开发。剩下的问题是：**怎样让网页版 ChatGPT 连接到这些运行在本地的工具？**

RemoteDesktopMCP 使用 OpenAI Secure MCP Tunnel 建立这条连接：本机主动连接 OpenAI，ChatGPT 再通过 Tunnel 调用本地的 Desktop Commander，无需将本地 MCP 服务端口暴露到公网，也不需要依赖 Desktop Commander 的第三方远程托管服务。

项目在此基础上补齐了 Windows、Linux 和 macOS 的安装、配置和服务管理。安装完成后，配置 Tunnel、启动服务并在 ChatGPT 注册插件，就可以直接从网页版 ChatGPT 操作本地文件和终端。

## 2. Quick Start

安装 RemoteDesktopMCP，配置连接，然后在 ChatGPT 中验证。需要网络连接和支持自定义 MCP Tunnel 的 ChatGPT 账号或工作区；安装包支持 Windows x64、Linux x64 和 Intel macOS。

### 2.1. 安装

从 [最新 Release](https://github.com/ThinkerQAQ/remote-desktop-mcp/releases/latest) 下载对应平台的安装包。

#### 2.1.1. 图形界面

##### Windows

运行 `RemoteDesktopMCP-v*-windows-amd64.exe`，按照安装向导完成安装，然后从开始菜单打开 **Configure Tunnel**。

##### macOS

打开 `RemoteDesktopMCP-v*-darwin-amd64.dmg`，运行其中的安装程序。安装完成时勾选 **Open RemoteDesktopMCP configuration**，即可在浏览器中打开配置界面。

##### Linux

在桌面环境中运行 `RemoteDesktopMCP-v*-linux-amd64.run`。如果提示没有执行权限，先在文件属性中允许作为程序运行。安装完成时勾选 **Open RemoteDesktopMCP configuration**，即可在浏览器中打开配置界面。

#### 2.1.2. 命令行

##### Windows

在下载目录打开终端：


```cmd
for %F in (RemoteDesktopMCP-v*-windows-amd64.exe) do "%~fF" --accept-licenses --default-answer --confirm-command install
```


##### macOS

挂载 DMG 并运行其中的安装器：


```bash
dmg=$(find . -maxdepth 1 -name 'RemoteDesktopMCP-v*-darwin-amd64.dmg' -print -quit)
mount=$(mktemp -d)
hdiutil attach -nobrowse -readonly -mountpoint "$mount" "$dmg"
app=$(find "$mount" -maxdepth 1 -name '*.app' -print -quit)
installer=$(find "$app/Contents/MacOS" -maxdepth 1 -type f -perm -111 -print -quit)
QT_QPA_PLATFORM=offscreen "$installer" --root "$HOME/RemoteDesktopMCP" --accept-licenses --default-answer --confirm-command install
hdiutil detach "$mount"
```


##### Linux


```bash
chmod +x ./RemoteDesktopMCP-v*-linux-amd64.run
QT_QPA_PLATFORM=offscreen ./RemoteDesktopMCP-v*-linux-amd64.run --root "$HOME/RemoteDesktopMCP" --accept-licenses --default-answer --confirm-command install
```

安装完成后，按下一节配置连接。

### 2.2. 配置

先在 [OpenAI Tunnel 设置](https://platform.openai.com/settings/organization/tunnels)创建 Tunnel ID，再通过 [API Keys](https://platform.openai.com/settings/organization/api-keys) 创建 Runtime API Key。

#### 2.2.1. 图形界面

在配置界面填写 Tunnel ID 和 Runtime API Key，保存并启动服务，然后刷新状态，确认 **Local Tunnel: Connected**。

#### 2.2.2. 命令行

在安装目录运行：

```bash
./bin/remotedesktopmcp configure
./bin/remotedesktopmcp start
./bin/remotedesktopmcp status
```

Windows 使用 `.\bin\remotedesktopmcp.exe`，子命令相同。交互式配置会隐藏 Runtime API Key；自动化场景可使用 `configure --id <tunnel-id> --api-key-stdin`，通过标准输入传递密钥。停止服务使用 `stop`。

### 2.3. 在 ChatGPT 验证

打开 [ChatGPT Plugins](https://chatgpt.com/plugins)，使用相同的 Tunnel ID 注册自定义 MCP 插件并完成授权。具体步骤见 [OpenAI 连接指南](https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt)。

在 ChatGPT 选择插件，调用只读工具 `list_sessions`。即使返回空列表，也说明工具调用成功。

### 2.4. 故障排查

Tunnel 未连接时，检查 ID、密钥、网络和服务状态。Tunnel 已连接但 ChatGPT 无法调用时，检查插件是否注册并在当前会话启用。不要公开密钥或含有私人信息的日志。

## 3. Development

如果只是使用安装包，不需要本节。需要修改源码或运行测试时，准备 Git，以及符合 [package.json](package.json) 要求的 Node.js 和 npm：

```bash
git clone https://github.com/ThinkerQAQ/remote-desktop-mcp.git
cd remote-desktop-mcp
npm ci --no-audit --no-fund
npm run check
npm run smoke
npm run audit:high
```

`check` 运行单元与兼容性测试，`smoke` 初始化 MCP 并做一次只读调用。Windows CMD 直接运行 `npm.cmd`。

代码变更通过 PR Review 和 Squash Merge 合入。安装包与正式版本的构建流程分别见 [Installer CI](.github/workflows/offline-installers.yml) 和 [Release CI](.github/workflows/release.yml)。

## 4. License

原创代码使用 [Apache-2.0](LICENSE)，第三方依赖及许可见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

RemoteDesktopMCP 以运行它的操作系统账户权限读写文件和执行命令，不额外提供工具沙箱。使用时应控制账户和插件的权限范围。MCP 请求与结果可能发送给连接的 AI 服务；`config.toml`、`runtime/`、密钥和日志不要公开或提交到 Git。

如果发现安全问题，可以通过 [GitHub Security Advisories](https://github.com/ThinkerQAQ/remote-desktop-mcp/security/advisories) 私下报告。
