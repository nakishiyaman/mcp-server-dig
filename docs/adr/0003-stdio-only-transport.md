# ADR-0003: stdioトランスポート専用

- Status: Accepted
- Date: 2026-01-01

## Context

MCPサーバーのトランスポートにはstdio（標準入出力）とHTTP（SSE/Streamable HTTP）がある。Smithery等の一部レジストリはHTTPトランスポートを要求する。

## Decision

stdioトランスポートのみをサポートする。

- `console.log` を禁止する（stdoutはJSON-RPCに専有されるため）
- 診断出力は `console.error`（stderr）のみ使用する
- HTTPトランスポートは当面サポートしない

## Consequences

- 実装がシンプルで、セキュリティリスク（ネットワーク露出）がない
- Claude Desktop、Claude Code、Zed等の主要クライアントはstdioをサポートしている
- Smithery登録には有料プラン（hosted deployment）が必要（ブロッカー）
- 将来HTTPが必要になった場合はMCP SDKのHTTPトランスポートを追加する
