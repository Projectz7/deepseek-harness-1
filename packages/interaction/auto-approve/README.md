# @deepseek-ai/dsh-auto-approve

Autonomous approval plugin: auto-allows every `approval/request` so tools, MCP servers, and shell run without interactive confirmation. Intended for the `autonomous` preset only.

## Usage

Installed by the `autonomous` preset:

```yaml
- id: auto-approve
  name: '@deepseek-ai/dsh-auto-approve'
```

Direct registration is also possible; `enabled: false` keeps the default approval posture.

## Behavior

- Registers a waterfall handler for `approval/request` that resolves to `allowed-once` without calling `next()`, short-circuiting the chain.
- Audit events `approval/asked` / `approval/decided` still fire with `allowed-once`.
- Fail-closed codes (`unavailable`, `rejected`) are never produced by this plugin.

## Model Experience

### What the model sees

Nothing additional; the model's tool calls proceed as if the user approved them.

### Token effect

None.

### KV Cache effect

None.

## Known Limitations and Deferred Work

- **No per-tool filtering** — every request is allowed; per-tool allow/deny lists are future work.
- **No policy persistence** — the grant is one-shot per request; durable policy switches still require explicit `approval/policy` events.