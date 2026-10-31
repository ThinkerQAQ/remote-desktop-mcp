# Security

[简体中文](docs/security.zh-CN.md)

This is a transport/deployment adapter with the privileges of its operating-system account. It does not implement authorization, a tool allowlist or shell isolation. All upstream tools are exposed. Use a dedicated account or container/VM and grant only intended filesystem/network privileges. Upstream allowed-directory and blocked-command settings must not be treated as a comprehensive sandbox.

Only configuration examples, adapter source and synthetic tests belong in Git. Never commit API keys, tunnel IDs, live environment files, user paths, logs, histories, screenshots or application data. Private configuration and runtime directories are ignored; inspect the staged diff before every push. Ignoring files does not remove previously committed secrets.

MCP requests/results may transmit files, command output and metadata to the connected AI platform. The adapter filters low-level log notifications and discards upstream stderr; it does not redact tool results or warning/error notifications. Do not use it to make confidential output safe for publication. Desktop Commander's telemetry and history are upstream behavior; review its own configuration and policy.

Keep tunnel health/admin listeners on loopback. Store private environment and generated configuration files as 0600 and parent directories as 0700 on POSIX; Windows uses an explicit current-user-only ACL. Never expose a raw stdio bridge or an unauthenticated network listener. Use official tunnel-client distribution and account controls. Authorization and connection health are separate concerns.

Report vulnerabilities privately using GitHub private vulnerability reporting if enabled, or contact **contact@thinkerqaq.com**. Do not include live credentials or private command output in a public issue. Rotate any exposed credential before sharing a sanitized report.
