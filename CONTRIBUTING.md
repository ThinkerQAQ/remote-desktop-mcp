# Contributing / 参与贡献

Create a branch and pull request; keep changes small. Run `npm ci`, `npm run check` and `npm run smoke` before submitting. Smoke runs an upstream MCP process and a read-only session query; do not run it under an account with unintended access. Never commit private configuration or output. Keep English and Chinese documentation aligned. Upstream changes should be proposed upstream when appropriate.

创建分支并通过 PR 提交，小步修改。提交前运行 `npm ci`、`npm run check` 和 `npm run smoke`；smoke 会启动上游 MCP 并只读查询会话，执行账户权限应符合预期。禁止提交私有配置和输出，中英文文档同步更新；适合上游的修改优先反馈上游。

The main branch requires a PR and the Linux/Windows CI matrix, with force pushes and deletion disabled. A solo maintainer can merge after CI without a second reviewer. Dependency updates need review; no automatic merge is configured.

main 要求 PR 及 Linux/Windows CI，通过后允许单人维护者合并，不要求第二位审核者；禁止强推及删除。依赖升级需人工评审，不配置自动合并。
