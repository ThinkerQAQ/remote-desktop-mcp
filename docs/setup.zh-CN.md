# 安装与部署

[English](setup.md)


推荐使用[一键配置向导](wizard.zh-CN.md)，下文保留手动部署方法。
## 本地 MCP

先完成 README 中的检查。本地 MCP 客户端直接执行 Node 加适配器绝对路径。可通过 `DV_CONFIG` 指定私有 TOML 文件，否则读取项目中的 `config.toml`，不存在时使用示例配置。该配置只控制本适配器，不会修改 Desktop Commander 自身设置。

## 常驻隧道（Linux / WSL2）

1. 按上游说明安装官方 tunnel-client（已验证 0.0.16），通过自己账户可用的入口创建隧道。本仓库不包含可使用的隧道或凭据。
2. 将 `config.example.toml` 复制为 `config.toml`，填入自己的隧道 ID 和空闲健康检查端口，执行 `chmod 600 config.toml`。
3. 执行 `npm run tunnel-config`，以 0600 权限独占创建 `runtime/tunnel.yaml`。文件使用兼容 YAML 1.2 的 JSON 语法；已有文件不会被覆盖。重新生成前先检查并删除旧生成文件。不要将真实配置贴到公开 Issue。
4. 通过仅本人可读的环境文件（0600）为服务提供 `OPENAI_API_KEY`。密钥值不要进入 shell 历史、命令参数和 Git。如修改 `api_key_env`，环境变量名称须一致。
5. 执行 `tunnel-client run --config /项目绝对路径/runtime/tunnel.yaml`。隧道负责启动适配器及常驻上游进程，该连接不需要再单独启动 `npm run mcp`。

systemd 可参考 `systemd.service.example`，填写项目、tunnel-client、Node 所在目录及私有环境文件的**绝对路径**，安装为用户服务后执行 `systemctl --user daemon-reload` 和 `systemctl --user enable --now remote-desktop-mcp`。需要退出登录后继续运行时，再根据主机权限启用 lingering。WSL2 必须保持运行，服务才能访问。

先验收新配置，再替换旧连接；并行测试应使用不同的健康检查端口。凭据及平台注册仍由本地和对应账户管理。

## 注册与验收

在账户支持的 ChatGPT 界面中，将隧道注册为自定义 MCP 连接。只有私有插件的 Skill 指令不等于注册了工具。分层验收：

1. `npm run doctor`：只检查本地前提和配置。
2. `npm run smoke`：实际执行本地初始化、发现工具、只读工具调用。
3. 检查回环地址的隧道 `/healthz` / `/readyz`：只证明传输层健康。不要将原始详细结果公开。
4. 在 ChatGPT 确认真实工具发现，并执行只读 `list_sessions`。有副作用的调用超时后，先确认是否执行，再决定是否重试。

每次调用无需新建连接，尽量复用同一进程和会话；无法因此消除客户端平台要求的授权。

## 排错

- 工具缺失：区分本地 MCP、隧道和客户端注册三层，先运行 smoke 再调整注册。
- 循环重启：在本地核对版本、环境变量及绝对路径。适配器不转发可能包含本地数据的上游 stderr；必要时在可信本地终端直接运行上游诊断。
- 初始化后无响应：生成配置启用了 `stdio_send_initialized_notification`，已验证的 tunnel-client 版本应保留此项。
- 工具权限超预期：检查上游配置及操作系统账户权限，本传输层没有工具白名单，也不隔离 shell。
- 原生 Windows：优先使用 `./setup.ps1` 安装原生隧道，系统采用当前用户计划任务管理；WSL2 是可选部署方式，不是必要条件。
