# ADR-0003: stdioトランスポート専用

- Status: Superseded
- Date: 2026-01-01
- Superseded by: v0.24.0 Streamable HTTP Transport対応 (2026-03-13)

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

## Superseded: Streamable HTTP Transport対応 (v0.24.0)

v0.24.0でStreamable HTTP Transportを追加。MCP SDK 1.27.1の`StreamableHTTPServerTransport`を活用。

- デフォルトはstdio（後方互換維持）
- `--http`フラグまたは`DIG_TRANSPORT=http`環境変数でHTTPモードに切り替え
- HTTPモード時: `127.0.0.1:3000`の`/mcp`エンドポイント（ポートは`DIG_PORT`で変更可）
- `console.log`禁止ルールは維持（MCP Logging Protocolに移行済み）
- 新規依存なし（SDK同梱のトランスポートを使用）
