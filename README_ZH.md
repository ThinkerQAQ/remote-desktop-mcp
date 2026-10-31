# Remote Desktop MCP（DV）

[English](README.md) · [安装部署](docs/setup.zh-CN.md) · [安全说明](docs/security.zh-CN.md) · [代码评审](docs/review.zh-CN.md)

通过 **Desktop Commander＋官方 OpenAI tunnel-client**，让 AI 助手使用本机文件、终端和搜索工具，复用常驻的 stdio 进程。本项目整理了 DV 已经使用的集成方案；工具引擎来自 Desktop Commander，不提供桌面画面点击功能。

## 功能

- 复用 Desktop Commander 的文件、终端会话、搜索和文档能力。
- 小型 stdio 适配器过滤 info/debug 日志通知及非协议 stdout，保留响应、错误、进度及更高级别通知。
- 上游进程失败会向常驻服务传递退出状态，移除 shell 管道和 jq 依赖。
- 私有 TOML 配置；健康检查仅监听回环地址；生成的隧道配置通过环境变量引用凭据。
- 只读验收：初始化 MCP、发现工具并调用 `list_sessions`，不输出本机会话数据。
- Linux/WSL2 常驻隧道部署，支持 Windows 本地 stdio；CI 覆盖两个系统。

## 快速开始

需要 Node.js **22.12+**、npm 和 Git，不依赖 Python。

```sh
git clone https://github.com/ThinkerQAQ/remote-desktop-mcp.git
cd remote-desktop-mcp
npm ci
npm run check
npm run doctor
npm run smoke
```

`npm run mcp` 启动 stdio 适配器。接入本地 MCP 客户端时，直接执行 `node /项目绝对路径/scripts/proxy.mjs`，避免 npm 提示信息进入协议通道。

如需从 ChatGPT 远程连接，另行安装官方 [tunnel-client](https://github.com/openai/tunnel-client)、创建自己的隧道，再按[部署文档](docs/setup.zh-CN.md)操作。隧道创建权限、账户可用性和 ChatGPT MCP 注册是独立前提。Skill 安装成功或隧道健康，均不代表 MCP 工具已经注册和发现。

## 定位与边界

DV 与 Remote Desktop Commander 的文件、命令能力重叠。DV 由自己部署 tunnel-client；Remote Desktop Commander 使用其自身的远程服务和设备选择。本项目提供可复现部署和传输验证，工具引擎继续使用上游，也不提供自主运行的 Agent。

适配器**不提供沙箱或授权隔离**，上游工具包含 shell 执行；Desktop Commander 配置不能替代操作系统隔离。建议使用只拥有预期权限的独立账户。经隧道发出的请求和结果可能到达 AI 服务，本地执行不代表数据只留在本地。上游遥测和设置仍由上游控制，本适配器未关闭它们。

长连接能减少重连，无法取消平台授权。终端执行本身不激活窗口，但启动 GUI 的命令可能影响焦点。v0.1 不管理原生 Windows 隧道服务，也不提供自动升级。

## 上游与许可证

集成代码采用 Apache-2.0。[Desktop Commander](https://github.com/wonderwhy-er/DesktopCommanderMCP) 采用 MIT，固定版本 0.3.0；[OpenAI tunnel-client](https://github.com/openai/tunnel-client) 采用 Apache-2.0，单独安装，已验证版本 0.0.16。详见[第三方声明](THIRD_PARTY_NOTICES.md)。本项目独立维护，不是 OpenAI 或 Desktop Commander 的官方产品。
