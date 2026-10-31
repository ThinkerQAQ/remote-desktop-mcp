## Remote Desktop MCP v0.3.1

**Windows, Linux and macOS** three-platform maintenance release. It includes the updated notices for Desktop Commander 0.3.1, MCP SDK, Zod, and local compatibility patches. All three archives contain the same Node.js source, lockfile, documentation, and Apache-2.0 LICENSE; the platform suffix indicates the native installation entry point.

| Platform | Asset | Entry point |
| --- | --- | --- |
| Windows 10/11 | `remote-desktop-mcp-v0.3.1-windows.zip` | `setup.ps1` (PowerShell) |
| Linux x64/arm64 | `remote-desktop-mcp-v0.3.1-linux.tar.gz` | `bash setup.sh` |
| macOS x64/arm64 | `remote-desktop-mcp-v0.3.1-macos.tar.gz` | `bash setup.sh` |

Use `SHA256SUMS` to validate each archive. The version-pinned `install.sh` and `install.ps1` bootstraps also verify SHA-256 before extraction. The optional tunnel-client and npm dependencies are installed separately, and users must provide **their own** Tunnel ID and secret; no private runtime config or data is included.

The project does not sandbox the underlying Desktop Commander tools, including terminal execution. Configure least-privilege permissions before enabling remote access. See [SECURITY.md](https://github.com/ThinkerQAQ/remote-desktop-mcp/blob/v0.3.1/SECURITY.md).

### 中文简介

三平台正式维护版本。提供 Windows、Linux、macOS 对应下载包及 `SHA256SUMS` 校验；首次安装从固定 v0.3.1 Release 获取，已安装实例保留原目录与私有配置，不会静默覆盖。此项目提供 Desktop Commander 的 MCP 集成，包含本机文件与终端权限；使用者必须配置自己的 Tunnel、运行密钥并在 ChatGPT 授权。
