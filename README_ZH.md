# Remote Desktop MCP（DV）

[English](README.md) · [安装部署](docs/setup.zh-CN.md) · [安全说明](docs/security.zh-CN.md) · [代码评审](docs/review.zh-CN.md)


> **实验性 v0.2：**上游传递依赖仍有安全告警，部署前请阅读[依赖评审](docs/review.zh-CN.md#依赖审计)。
通过 **Desktop Commander＋官方 OpenAI tunnel-client**，让 AI 助手使用本机文件、终端和搜索工具，复用常驻的 stdio 进程。本项目整理了 DV 已经使用的集成方案；工具引擎来自 Desktop Commander，不提供桌面画面点击功能。

## 功能

- 复用 Desktop Commander 的文件、终端会话、搜索和文档能力。
- 小型 stdio 适配器过滤 info/debug 日志通知及非协议 stdout，保留响应、错误、进度及更高级别通知。
- 上游进程失败会向常驻服务传递退出状态，移除 shell 管道和 jq 依赖。
- 私有 TOML 配置；健康检查仅监听回环地址；生成的隧道配置通过环境变量引用凭据。
- 只读验收：初始化 MCP、发现工具并调用 `list_sessions`，不输出本机会话数据。
- Linux/WSL2 常驻隧道部署，支持 Windows 本地 stdio；CI 覆盖两个系统。

## 一键配置（Linux / WSL2）

```sh
curl -fsSL https://raw.githubusercontent.com/ThinkerQAQ/remote-desktop-mcp/v0.2.0/install.sh | bash
```

已经下载或克隆仓库：执行 `bash setup.sh`。Windows PowerShell：执行 `./setup.ps1`，需要已初始化的 WSL2 Ubuntu；入口会把源码复制到 Linux 文件系统。

向导会自动补齐 Node.js/tunnel-client（官方分发、SHA-256 校验），安装锁定的 npm 依赖，执行真实只读 MCP 测试，然后收集你自己的 Tunnel ID 和运行密钥（隐藏输入），保存私有配置、启动常驻进程并检查隧道就绪。重复运行可保留已保存值；端口冲突时自动换用空闲回环端口。不替换全局 Node 或现有 DV 隧道。

用户仍需创建自己的隧道和运行密钥，并在 ChatGPT 注册自定义 MCP。向导会给出官方入口和下一步；完成前将远程注册与调用明确标为**待完成**，不会把本地或隧道成功当作远程全链路验收。这个文件/终端集成无需开启 Edge 调试。

详细参数、重复运行、无人值守配置、恢复及边界见[向导说明](docs/wizard.zh-CN.md)。首次下载源码需要 curl/tar；Ubuntu/WSL 会通过 apt 补齐其他基础工具，sudo 可能要求输入系统密码；其他发行版需提前安装基础工具。运行依赖保存在项目下，npm 安装可能执行上游安装钩子。依赖安全告警仍按上文披露。

开发验证使用 `npm ci`、`npm run check`、`npm run smoke`。本地 MCP 客户端直接执行 `node /项目绝对路径/scripts/proxy.mjs`。官方 [tunnel-client](https://github.com/openai/tunnel-client) 由向导另行安装，Git 中不内嵌其二进制。

## 定位与边界

DV 与 Remote Desktop Commander 的文件、命令能力重叠。DV 由自己部署 tunnel-client；Remote Desktop Commander 使用其自身的远程服务和设备选择。本项目提供可复现部署和传输验证，工具引擎继续使用上游，也不提供自主运行的 Agent。

适配器**不提供沙箱或授权隔离**，上游工具包含 shell 执行；Desktop Commander 配置不能替代操作系统隔离。建议使用只拥有预期权限的独立账户。经隧道发出的请求和结果可能到达 AI 服务，本地执行不代表数据只留在本地。上游遥测和设置仍由上游控制，本适配器未关闭它们。

长连接能减少重连，无法取消平台授权。终端执行本身不激活窗口，但启动 GUI 的命令可能影响焦点。v0.2 不管理原生 Windows 隧道服务，也不提供自动升级。

## 上游与许可证

集成代码采用 Apache-2.0。[Desktop Commander](https://github.com/wonderwhy-er/DesktopCommanderMCP) 采用 MIT，固定版本 0.3.0；[OpenAI tunnel-client](https://github.com/openai/tunnel-client) 采用 Apache-2.0，单独安装，已验证版本 0.0.16。详见[第三方声明](THIRD_PARTY_NOTICES.md)。本项目独立维护，不是 OpenAI 或 Desktop Commander 的官方产品。
