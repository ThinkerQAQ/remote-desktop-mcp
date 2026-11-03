# RemoteDesktopMCP

[English](README.md)

- [1. Introduction](#1-introduction)
- [2. Quick Start](#2-quick-start)
- [3. Configuration](#3-configuration)
- [4. Optional Features](#4-optional-features)
- [5. Development](#5-development)
- [6. License](#6-license)

## 1. Introduction

假设我们想让 ChatGPT 帮忙查看电脑上的日志、修改文件，或者运行一条终端命令。通常需要先把文件上传，或者手动复制命令和执行结果。RemoteDesktopMCP 解决的就是这类本地操作的问题：通过 OpenAI Secure MCP Tunnel，把电脑上的 [Desktop Commander](https://github.com/wonderwhy-er/DesktopCommander) 工具接入 ChatGPT。

它提供文件搜索、读写和终端命令能力，不是共享桌面画面、远程操作鼠标的工具。服务以当前操作系统用户的权限运行，因此也只能访问这个用户有权限操作的资源。

现在 Windows、Linux 和 macOS 都有完整的安装包，里面已经包含 Node.js、运行依赖和 Tunnel Client。正常安装不需要另外准备 Node.js，也不需要 Windows 用户先配置 WSL。

## 2. Quick Start

下面以第一次把电脑连接到 ChatGPT 为例，走完安装、配置、启动和验收。Windows 使用配置窗口；Linux 和 macOS 使用安装包里的终端向导，其他步骤基本一样。

### 2.1. 准备环境

目前提供的是 Windows x64、Linux x64 和 macOS Intel 安装包。如果使用 ARM64 设备，这些安装包不能直接使用。

还需要一台可以联网的电脑，以及支持自定义 MCP Tunnel 的 ChatGPT 账号或工作区。Tunnel ID 和 Runtime API Key 可以等安装好后再创建，不用提前填写配置文件。

### 2.2. 下载安装

首先打开 [GitHub Latest Release](https://github.com/ThinkerQAQ/remote-desktop-mcp/releases/latest)，根据系统下载对应的安装包：

| 系统 | 安装包 |
| --- | --- |
| Windows x64 | `RemoteDesktopMCP-v*-windows-amd64.exe` |
| Linux x64 | `RemoteDesktopMCP-v*-linux-amd64.run` |
| macOS Intel | `RemoteDesktopMCP-v*-darwin-amd64.dmg` |

这里下载 **Assets 中的安装包**就行，不需要下载源码压缩包。

Windows 直接运行 EXE，选择安装目录并完成安装。最后一页可以勾选 **Open RemoteDesktopMCP configuration**，安装结束后会直接打开配置窗口。以后想修改配置，也可以从开始菜单进入 **RemoteDesktopMCP → Configure Tunnel**。

macOS 打开 DMG，运行其中的安装程序。Linux 则在下载目录执行：

```bash
chmod +x RemoteDesktopMCP-v*-linux-amd64.run
./RemoteDesktopMCP-v*-linux-amd64.run
```

以上命令适用于下载目录中只有一个匹配版本的情况。安装完成后记住安装目录，下一步配置 Tunnel 时还会用到。

### 2.3. 配置并启动 Tunnel

安装完成后，我们需要让本机的 Tunnel Client 知道连接哪个 Tunnel，以及使用什么密钥进行认证。

先打开 [OpenAI Tunnel 设置](https://platform.openai.com/settings/organization/tunnels)，创建一个 Tunnel，拿到 **Tunnel ID**；再到 [API Keys](https://platform.openai.com/settings/organization/api-keys) 创建 **Runtime API Key**。

以 Windows 为例，打开刚才的 **Configure Tunnel** 窗口：

1. 填入 Tunnel ID 和 Runtime API Key，点击 **Save**。这一步只保存配置，不会启动服务。
2. 点击 **Start Service**。服务启动后，按钮会切换为 **Stop Service**。
3. 点击 **Refresh Status**，确认状态显示 **Local Tunnel: Connected**。

这样本地 Tunnel 就启动好了。以后重新打开配置窗口，已经保存的 Runtime API Key 会显示为掩码，不需要每次都重新输入。

Linux 和 macOS 的配置方式略有不同。在安装目录的终端中执行：

```bash
./Configure-RemoteDesktop.sh
```

macOS 也可以打开 `Configure-RemoteDesktop.command`。按照终端提示填写 Tunnel ID 和密钥即可，向导会保存配置并启动本机服务。

### 2.4. 在 ChatGPT 中验收

现在本地 Tunnel 已经连接，但 ChatGPT 还不知道应该使用哪个 MCP 服务，所以还需要完成一次插件注册。

打开 [ChatGPT Plugins](https://chatgpt.com/plugins)，添加自定义 MCP 服务，连接方式选择 **Tunnel**，然后选择或填写刚才创建的 Tunnel ID，按页面提示完成授权。界面名称可能随版本变化，可以对照 [OpenAI 的接入说明](https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt)。

注册好后，回到 ChatGPT 对话，选择这个插件，先做一个不会修改电脑内容的测试，例如：

> 调用 RemoteDesktopMCP 的 `list_sessions`，只读取当前会话，不要修改文件。

如果工具能够正常返回，说明 ChatGPT → Tunnel → 本机 MCP 这条链路已经通了。刚安装的电脑可能没有会话，返回空列表也没关系；关键是工具调用成功，而不是会话数量。

到这里就可以正常使用了。之后需要远程调用时，电脑和本地服务要保持运行。

### 2.5. 常见问题

**本地一直没有连接成功。** 先核对 Tunnel ID、Runtime API Key 和网络，再点击 **Refresh Status**。仍然失败的话，查看本地日志定位原因；不要把密钥或完整的私人日志贴到公开 Issue 中。

**本地显示 Connected，但 ChatGPT 调不到工具。** 这通常不是同一个问题。Connected 说明本机 Tunnel 已就绪，还要检查 ChatGPT 是否注册了同一个 Tunnel、是否完成授权，以及当前对话是否选中了插件。

**改了配置，为什么还是原来的连接？** 因为 **Save** 只负责保存，不会打断正在运行的服务。需要让新配置生效时，先点击 **Stop Service**，再点击 **Start Service**。

**操作的怎么是 WSL 或另一台电脑？** 检查 ChatGPT 连接的 Tunnel ID 和实际运行服务的电脑。Windows 原生安装不依赖 WSL，也不要同时用相同的 Tunnel ID 启动两个实例。

仍然无法解决，可以到 [Issues](https://github.com/ThinkerQAQ/remote-desktop-mcp/issues) 描述复现步骤和脱敏后的错误信息。

## 3. Configuration

Windows 安装后主要在 **Configure Tunnel** 窗口管理配置和服务。开始菜单里可以找到这个入口，也可以直接运行安装目录下的 `bin/RemoteDesktopMCP-Configure.exe`。

各个操作的区别如下：

| 操作 | 说明 |
| --- | --- |
| **Save** | 校验并保存 Tunnel ID、Runtime API Key，不改变当前服务状态 |
| **Start Service / Stop Service** | 使用保存的配置启动服务，或停止正在运行的服务 |
| **Refresh Status** | 重新读取服务状态，不修改配置 |
| **Auto-start at Windows sign-in** | 控制当前用户登录 Windows 后是否自动启动；切换开关不会停止当前连接 |
| **Open ChatGPT Plugins** | 打开 [ChatGPT 插件页面](https://chatgpt.com/plugins) |

日常使用中，只改配置时点击 Save 就够了；如果服务已经启动，修改后的配置要等下次启动才会生效，因此可以按照 **Save → Stop Service → Start Service** 的顺序操作。

配置文件保存在安装目录的 `config.toml` 和 `runtime/` 中，后者还包含认证信息。需要迁移或卸载时，建议先停止服务并备份这两个位置。

Windows 的安装维护入口是开始菜单中的 **RemoteDesktopMCP → Manage RemoteDesktopMCP**，可以从这里进入修改配置或卸载。

## 4. Optional Features

### 4.1. Case 1：通过命令行管理服务

Linux 和 macOS 没有 Windows 的三按钮配置窗口。如果不想再次运行配置向导，可以直接在安装目录使用下面的命令查看、停止或启动服务：

```bash
# 查看状态
./bin/node ./scripts/runtime.mjs status

# 停止服务
./bin/node ./scripts/runtime.mjs stop

# 启动服务
./bin/node ./scripts/runtime.mjs start
```

按需要执行对应的命令即可。如果是修改 Tunnel ID 或密钥，则重新运行 `./Configure-RemoteDesktop.sh`；macOS 也可以使用 `./Configure-RemoteDesktop.command`。与 Windows 的 Save 不同，这个终端向导会在保存配置后启动服务。

不同系统的后台运行方式也不一样：Windows 登录自启动使用用户计划任务；macOS 使用 LaunchAgent；Linux 优先使用用户级 systemd，无法使用时退回普通后台进程。Linux 的后台回退模式不保证注销或重启后自动恢复。

### 4.2. Case 2：连接本地 MCP 客户端

如果只是想把 RemoteDesktopMCP 接入同一台电脑上的其他 MCP 客户端，可以直接使用 stdio 模式。这种情况不需要创建 Tunnel，也不需要 Runtime API Key。

先按照 [Development](#5-development) 安装源码依赖，再将客户端的 MCP 配置指向 `scripts/proxy.mjs`：

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

这里的路径要换成源码在你电脑上的实际绝对路径。保存客户端配置并重新连接后，同样可以用 `list_sessions` 做一次只读验收。

注意这与前面的 ChatGPT Tunnel 是两种接入方式，本地 stdio 能调用成功，并不表示 ChatGPT Tunnel 也已连接。

## 5. Development

上面的安装包已经包含运行依赖。如果要修改源码、运行测试或参与开发，则需要 Git，以及符合 [package.json](package.json) 要求的 Node.js 和 npm。

```bash
git clone https://github.com/ThinkerQAQ/remote-desktop-mcp.git
cd remote-desktop-mcp
npm ci --no-audit --no-fund
npm run check
npm run smoke
npm run audit:high
```

其中 `check` 用于运行兼容性检查与单元测试，`smoke` 会初始化 MCP、发现工具并进行一次只读调用。Windows PowerShell 如果因执行策略无法运行 `npm`，可改用 `npm.cmd`。

代码修改通过 PR Review 和 Squash Merge 合入。构建与发布流程可以直接参考 [安装包 CI](.github/workflows/offline-installers.yml) 和 [Release CI](.github/workflows/release.yml)。

## 6. License

项目原创代码使用 [Apache-2.0](LICENSE)，第三方依赖及其许可见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

RemoteDesktopMCP 会以当前操作系统账户的权限读写文件和执行命令，没有额外的工具级沙箱或白名单。因此，接入前需要确认账户权限及 ChatGPT 插件授权范围，不建议让它以管理员账户长期运行。MCP 请求与执行结果也可能传输给连接的 AI 服务。

`config.toml`、`runtime/`、密钥和日志都属于本机私有数据，不要提交到 GitHub。如发现安全问题，可以通过 [GitHub Security Advisories](https://github.com/ThinkerQAQ/remote-desktop-mcp/security/advisories) 私下报告。
