# @deepseek-ai/dsh-command-memory

English | [中文](README.zh.md)

Human-facing `/memory` command for a durable project memory file (`MEMORY.md`) in the session workspace. The plugin registers one global command through [`ctx.commands`](../../interaction/commands/README.md), so every composed command adapter discovers and executes it without a model turn. It ports Claude Code's project-memory concept onto dsh as an additive, isolated plugin.

## Command contract

| Input | Result |
|---|---|
| `/memory` | Show the current `MEMORY.md` content, or `Memory is empty.` when none exists. |
| `/memory <text>` | Append `<text>` as a new line to `MEMORY.md`, creating the file if needed. |
| `/memory show` | Alias of the bare command: display the current memory. |
| `/memory clear` | Empty `MEMORY.md` while keeping the file. |

Because the generic command plane has no modal editor, every non-empty, non-`show`, non-`clear` input is treated as memory text to append — matching Claude Code's `memory` behavior. Accepted writes are local file operations; the command outcome is the only user-visible output.

## Composition

The producer injects `commands`. A custom app mounts its owner plus this plugin:

```yaml
- id: commands
  name: '@deepseek-ai/dsh-commands'
- id: command-memory
  name: '@deepseek-ai/dsh-command-memory'
```

The shipped `dsh` base can enable this command alongside the standard command stack.

## Model Experience

### Human `/memory` control

#### What the model sees

The slash input, the file write, and the direct status/error output are absent from model requests. The memory file is an ordinary workspace file the model may later read through its normal file tools when relevant.

#### Token effect

Reading, appending to, or clearing memory adds no model tokens; the operation is a local file write surfaced only as command output.

#### KV Cache effect

Command discovery, mutations, and direct output do not affect the cache.

## Known Limitations and Deferred Work

- **No automatic injection** — the memory file is not yet auto-injected into every prompt; the model reads it through ordinary file tools when relevant. Auto-injection via `agent/pre-step` or the `agent-instructions` candidate list is deferred work.
- **Plain-text interaction only** — the generic command registry has no modal edit form; append and clear keep destructive intent deterministic across adapters.
- **One file per workspace** — `MEMORY.md` at the session `cwd` is the only memory target; per-directory or hierarchical memory is future work.
