# @deepseek-ai/dsh-mcp-auto

Auto-discovery bridge for MCP servers from workspace `mcp.json`.

## Usage

Drop an `mcp.json`/`mcp.jsonc`/`.cursor/mcp.json` beside the session `cwd` and the plugin auto-registers one `dsh-mcp-client` per server on `agent/session-start`:

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["./server.js"]
    },
    "http-server": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

No `cordis.yml` entry per server is required; the generated `dsh-mcp-client` instances behave identically to manually composed ones (same `serverName` namespacing, same HMR/disposal lifecycle).

## Composition

```yaml
- id: mcp-client # underlying bridge, auto-loaded by mcp-auto
  name: ''@deepseek-ai/dsh-mcp-client''
- id: mcp-auto
  name: ''@deepseek-ai/dsh-mcp-auto''
```

The bundle `web` enables this automatically; the plugin is additive and does not replace global config.

## Config

| Field | Required | Description |
|---|---|---|
| `mcpFileNames` | no | Ordered file names to probe under `cwd`. Default: `mcp.json`, `.cursor/mcp.json`, `.vscode/mcp.json`, `mcp.jsonc`, `.cursor/mcp.jsonc` |

## Behavior

- Probes `agent.session.header.cwd` on `agent/session-start` via `findMcpJson`; first file with a valid `mcpServers` object wins.
- Supports `jsonc` (strips `//` and `/* */`) and validates `serverName` as `[A-Za-z0-9_-]{1,32}`.
- `stdio` entries require `command`; `http` entries require `url`; otherwise skipped with warning.
- Deduplicates by `cwd:serverName`; disposal via `ctx.effect` tears down all generated clients.

## Model Experience

### What the model sees

MCP tools appear as `mcp__<serverName>__<toolName>` on `ctx.tools`, identical to manually configured servers. No additional prompt is injected.

### Token effect

No extra tokens until the model calls a discovered tool.

### KV Cache effect

Tool list is part of the prompt; discovered servers participate in normal tool caching.

## Known Limitations and Deferred Work

- **One file wins** — only the first matching `mcp.json` variant is read; merging multiple files is deferred.
- **No watch** — changes to `mcp.json` require a new session; file watching is future work.
- **No secrets mapping** — `env`/`headers` are taken verbatim; credential-ref interpolation is deferred.