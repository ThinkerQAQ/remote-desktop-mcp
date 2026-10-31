# Third-party notices / 第三方声明

This repository contains original integration code. It does not vendor Desktop Commander or tunnel-client source/binaries. Runtime dependencies retain their own licenses; installation and redistribution must preserve applicable notices.

本仓库保存原创集成代码，不内嵌 Desktop Commander 或 tunnel-client 源码及二进制。运行依赖保留各自许可证，安装及再分发时应保留适用声明。

| Component | License | Role |
| --- | --- | --- |
| @wonderwhy-er/desktop-commander 0.3.1 | MIT | MCP tool engine; compatibility-patched after install |
| @modelcontextprotocol/sdk 1.32.2 | MIT | Read-only smoke client |
| smol-toml 1.9.1 | BSD-3-Clause | TOML parser |
| zod 4.6.7 | MIT | Schema compatibility dependency |
| openai/tunnel-client (separate install; tested 0.0.16) | Apache-2.0 | Persistent remote transport |

Desktop Commander attribution: Copyright (c) 2024–2025 Eduard Ruzga and Desktop Commander Contributors. Project names and marks belong to their respective owners. See installed dependency LICENSE files for full terms and transitive dependency licenses.

## Dependency modifications and redistribution / 依赖修改与再分发

The installer runs `scripts/patch-upstream.mjs` against the locally installed Desktop Commander 0.3.1 distribution. The patch adjusts its Zod schema declarations and schema conversion shim for the adapter's pinned dependency set. This is a modification of installed upstream files, **not** a change in Desktop Commander's MIT license or authorship. See the patch script for the exact edits.

安装过程会执行 `scripts/patch-upstream.mjs`，对本地安装的 Desktop Commander 0.3.1 分发文件进行 Zod 兼容性修改。这是对上游文件的本地修改，不代表上游作者或许可证发生变化。具体差异以补丁脚本为准。

The table lists direct dependencies only, not every transitive dependency. The checked-in `package-lock.json` is the version source of truth. If you redistribute a packaged copy of `node_modules`, a modified upstream build, or an executable/container containing dependencies, include all applicable license texts, copyright notices and modification notices for the **actual shipped versions**, including transitive components. Links to upstream repositories are not a replacement for required license texts in a redistributed package.

上表仅覆盖直接依赖。分发含 `node_modules`、已修改上游文件、可执行产物或容器镜像时，必须按**实际交付版本**保留第三方与传递依赖的适用许可文本、版权信息及修改说明；上游链接不能替代依法应随包附带的完整许可文本。
