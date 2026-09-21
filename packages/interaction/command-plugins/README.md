# @deepseek-ai/dsh-command-plugins

Human-facing `/plugins` command with two jobs: enable or disable model tools
at runtime to fit rate-limited APIs, and mount the Jarvis extensions
(screen, browser, desktop) on demand AFTER the core opens. Extensions never
load at boot: the core always opens clean, and each extension mounts in its
own fiber — a failure is reported as the command result while the app keeps
running (fault isolation).

## Command contract

| Input | Result |
|---|---|
| `/plugins`, `/plugins list` | Tool matrix plus extension load status. |
| `/plugins ext` | Extension catalog: ids, groups, blurbs, load state. |
| `/plugins disable <tool>`, `/plugins enable <tool>` | Deny/allow one model tool, immediately (guard + prompt filter read live state). Persists to `~/.dsh/plugins.json`. |
| `/plugins preset <light\|standard\|minimal>` | Bulk tool mask, immediately. |
| `/plugins reset` | Re-enable every tool, immediately. |
| `/plugins load <tela\|navegador\|desktop\|jarvis\|id>` | Mount extensions in dependency order, each isolated. Loading auto-enables its model tools. |
| `/plugins unload <...>` | Unmount extensions, dependents first. |

Group aliases: `tela` (screen-capture + tool-screen), `navegador` (browser +
tool-browser), `desktop` (tool-desktop-control), `jarvis` (all five). Model
tool names (`screen_capture`, `site_explorer`, `desktop_control`) also work
as load targets. Loaded extensions are intentionally NOT persisted: every
start opens clean, the user activates afterwards.

## Composition

The producer injects `commands` and `tools`. A custom app mounts its owner
plus this plugin:

```yaml
- id: commands
  name: '@deepseek-ai/dsh-commands'
- id: command-plugins
  name: '@deepseek-ai/dsh-command-plugins'
```

The shipped web bundle inserts this command at host level, so every session
shares one loader: one `/plugins load jarvis` per app start suffices.

## Model Experience

### Human `/plugins` control

#### What the model sees

The slash input and the direct status/error output are absent from model
requests. Disabled tools vanish from the tool catalog the model receives
(system-prompt assembly filters them per turn); denied calls return a guard
message naming the re-enable command. Newly loaded extensions appear in the
catalog from the next turn, because the schema provider reads the live
registry on every assembly.

#### Token effect

Each disabled tool removes its schema (~0.3–1.8K chars) from every request.
The `light` preset cuts roughly half the catalog, which is what keeps the
DeepSeek Free route responsive.

## Known Limitations and Deferred Work

- No keyless REAL-composition test yet for the load/unload path (boot,
  typecheck, lint, config gate, and live boot probes cover it); the
  mechanism reuses loader-tested primitives (dynamic import, `ctx.plugin`,
  fiber dispose).
- The `ui-browser-tab` and `ui-screen-status` browser widgets stay parked:
  their browser halves inject host-only services, which never resolve
  client-side. They need a host Remote API before they can load on demand.
