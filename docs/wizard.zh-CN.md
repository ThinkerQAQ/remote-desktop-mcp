# 一键配置向导

[English](wizard.md)

仓库内执行 `bash setup.sh`，或使用 README 中固定版本的一行安装命令。Windows 在 PowerShell 中执行 `./setup.ps1`，前提是已经初始化 WSL2 Ubuntu。入口只复制源码到 WSL 内的 `~/.local/share/remote-desktop-mcp`，凭据保存在 Linux 文件系统。安装或启用 WSL 本身可能需要管理员操作及重启；入口会明确提示，不会虚报成功。

## 自动完成的步骤

1. 检查 Linux x64/arm64、基础工具和 Node 22.12+。Ubuntu 通过 apt 补齐基础工具，sudo 可能询问系统密码。缺少 Node 时，私有安装官方 24.21.0，并核对 SHA-256。
2. 复用已有 tunnel-client；不存在时从官方 GitHub release 私有安装已验证的 0.0.16，并核对 SHA-256。不升级现有安装。
3. 按 lockfile 执行 `npm ci`，禁用 Puppeteer 浏览器下载。上游安装钩子是否执行受 npm 策略控制；向导不会把配置密钥传给依赖安装步骤。
4. 输入自己的 Tunnel ID 和运行密钥，密钥隐藏输入；回车可保留已保存值。仓库不附带真实凭据。
5. 实际执行本地 MCP 初始化、工具发现和只读 list_sessions，不将会话内容打印到控制台；该子进程不继承向导收集的密钥环境变量。
6. 选择空闲回环端口，以 0600 权限原子保存配置和凭据。拒绝符号链接及无法实施私有文件权限的文件系统。首次使用不会覆盖手动创建的 config.toml。
7. 安装并启动项目专属 systemd 用户服务；没有可用用户服务管理器时，启动有身份校验的后台进程。服务名由项目路径派生，不覆盖现有 DV 服务。
8. 检查托管进程与 `/readyz`，输出账户注册步骤。失败返回非零退出码，保留私有配置供修复后重试。

## 仍需用户完成的账户步骤

通过 <https://platform.openai.com/settings/organization/tunnels> 创建自己的隧道，并在账户官方密钥入口获取适用的运行密钥。账户是否支持以及访问策略可能不同。将对应值填入向导；不能共用维护者的隧道，也不要为方便而使用管理员密钥。

在账户支持的 ChatGPT 自定义 MCP 入口中注册该隧道：<https://chatgpt.com/#settings/Connectors>。确认真实工具发现，并执行只读 `list_sessions`。账户操作不能靠本地写配置代替，向导会将其明确标为待完成。

## 重复配置、状态和恢复

- 重跑 `bash setup.sh` 可保留已保存值并恢复启动，不会创建新的平台隧道。
- `npm run status` 只输出进程和就绪布尔值，以及尚未验证的注册状态；`npm run start` 恢复保存的启动方式；`npm run stop` 只停止当前项目的托管服务或进程。
- `bash setup.sh --configure-only` 只保存配置并验证本地 MCP，不启动隧道。
- 首次配置可用 `bash setup.sh --background` 选择后台模式。后台进程可脱离终端，但重启或注销后不会自动恢复；systemd 可在进程故障后重启，注销后常驻取决于主机 lingering 策略。WSL 自身仍须运行。
- 活跃后台模式要更换隧道或密钥，先执行 `npm run stop` 再重跑向导；systemd 模式只重启当前项目专属服务。
- 隧道未就绪时，核对账户权限、密钥与隧道匹配及本地网络，再重试。私有的 runtime/tunnel.log 可能包含上游敏感诊断，不要公开。
- 安装器会复用已有安装，不自动升级源码、切换托管方式、启用 lingering 或修改操作系统隔离。

## 无人值守配置

由密钥管理器或进程环境提供 `DV_TUNNEL_ID` 和 `DV_RUNTIME_API_KEY`，执行 `bash setup.sh --non-interactive`。不要把密钥值写入命令参数、shell 历史或 CI 日志；重复运行可省略环境变量并复用保存值。`DV_TUNNEL_CLIENT` 可指定已有客户端绝对路径；`DV_INSTALL_DIR` 指定安装器目标目录。`DV_FORCE_MANAGED_NODE=1` 和 `DV_FORCE_MANAGED_TUNNEL=1` 用于验证私有下载安装，不替换系统工具。

向导创建的唯一密钥文件是 runtime/credentials.json（0600），隧道 YAML 仅引用环境变量。config.toml 和 runtime/ 已加入 Git 忽略。本地运行仍拥有上游工具及操作系统账户权限，工具结果可能传往 AI 平台，详见安全和评审文档。
