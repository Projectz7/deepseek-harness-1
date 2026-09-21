/**
 * Human-facing `/plugins` command: enable or disable tools at runtime to reduce
 * prompt size for rate-limited APIs (e.g. DeepSeek Free), plus on-demand
 * loading of the Jarvis extensions (screen / browser / desktop) AFTER the
 * core opens. Extensions never load at boot: each mounts in its own fiber
 * and a failure is reported as the command result while the app keeps
 * running (fault isolation).
 *
 * Disabled-tool state persists to `~/.dsh/plugins.json`. Loaded extensions
 * are intentionally NOT persisted: every start opens clean, the user
 * activates afterwards with `/plugins load`.
 * @module @deepseek-ai/dsh-command-plugins
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import type { Context, Plugin } from '@deepseek-ai/cordis'
import type { CommandInvocation, CommandResult } from '@deepseek-ai/dsh-commands'
import type { ToolGuard } from '@deepseek-ai/dsh-tools'

export const name = 'command-plugins'
export const inject = ['commands', 'tools']

// ── persistence ────────────────────────────────────────────────────────────

const CONFIG_DIR = join(homedir(), '.dsh')
const CONFIG_FILE = join(CONFIG_DIR, 'plugins.json')

interface PluginsConfig {
  /** Tool names the user has disabled. */
  disabled: string[]
}

function loadConfig(): PluginsConfig {
  if (!existsSync(CONFIG_FILE)) return { disabled: [] }
  try {
    const raw = readFileSync(CONFIG_FILE, 'utf8')
    const parsed = JSON.parse(raw) as Partial<PluginsConfig>
    return { disabled: Array.isArray(parsed.disabled) ? parsed.disabled : [] }
  } catch {
    return { disabled: [] }
  }
}

function saveConfig(config: PluginsConfig): void {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true })
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n')
}

// ── tool catalog (shipped tool names) ──────────────────────────────────────

/**
 * Canonical list of tool names the standard preset ships. Users can only
 * disable tools in this list; unknown names are rejected with a hint.
 * Kept in sync with `gen-tool-catalog.spec.ts`.
 */
const SHIPPED_TOOLS: readonly string[] = [
  // shell
  'bash', 'pwsh',
  // filesystem
  'read', 'write', 'edit', 'read_image', 'glob', 'grep', 'str_replace_editor',
  // web
  'web_search', 'web_fetch',
  // skills & goals
  'skill', 'get_goal', 'create_goal', 'update_goal',
  // delegation
  'subagent', 'subagent_fork', 'send_message', 'interrupt_agent', 'list_agents',
  'workflow', 'ralph',
  // interaction
  'ask_user_question', 'todo_write',
  // background jobs
  'job_output', 'job_list', 'job_kill',
  // plan
  'exit_plan_mode',
  // cordis
  'cordis_inspect_list', 'cordis_inspect_query', 'cordis_inspect_self',
  'cordis_define', 'cordis_run', 'cordis_stop', 'cordis_undefine',
  // terminal (persistent)
  'terminal_open', 'terminal_send', 'terminal_read', 'terminal_signal',
  'terminal_close', 'terminal_list',
  // session
  'session_search', 'session_event_search', 'session_trace',
  'session_event_trace', 'session_event_read',
  // desktop / screen / browser (our extensions)
  'desktop_control', 'screen_capture', 'site_explorer', 'browser_navigate',
  // LSP
  'lsp',
  // schedule
  'schedule_create', 'schedule_list', 'schedule_delete',
]

/** Grouped display name map for pretty output. */
const TOOL_GROUPS: Record<string, readonly string[]> = {
  'Shell': ['bash', 'pwsh'],
  'Filesystem': ['read', 'write', 'edit', 'read_image', 'glob', 'grep', 'str_replace_editor'],
  'Web': ['web_search', 'web_fetch'],
  'Skills & Goals': ['skill', 'get_goal', 'create_goal', 'update_goal'],
  'Delegation': ['subagent', 'subagent_fork', 'send_message', 'interrupt_agent', 'list_agents', 'workflow', 'ralph'],
  'Interaction': ['ask_user_question', 'todo_write'],
  'Jobs': ['job_output', 'job_list', 'job_kill'],
  'Plan': ['exit_plan_mode'],
  'Cordis': ['cordis_inspect_list', 'cordis_inspect_query', 'cordis_inspect_self', 'cordis_define', 'cordis_run', 'cordis_stop', 'cordis_undefine'],
  'Terminal': ['terminal_open', 'terminal_send', 'terminal_read', 'terminal_signal', 'terminal_close', 'terminal_list'],
  'Session': ['session_search', 'session_event_search', 'session_trace', 'session_event_trace', 'session_event_read'],
  'Desktop / Screen / Browser': ['desktop_control', 'screen_capture', 'site_explorer', 'browser_navigate'],
  'LSP': ['lsp'],
  'Schedule': ['schedule_create', 'schedule_list', 'schedule_delete'],
}

// ── command handler ────────────────────────────────────────────────────────

function handlePlugins(rawInput: string, live: { disabled: Set<string>; loaded: readonly string[] }): CommandResult {
  const parts = rawInput.trim().split(/\s+/)
  const sub = (parts[0] ?? '').toLowerCase()
  const target = (parts[1] ?? '').toLowerCase()

  const config = loadConfig()

  // ── /plugins (no args) or /plugins list ────────────────────────────────
  if (sub === '' || sub === 'list') {
    return renderList(config, live.loaded)
  }

  // ── /plugins disable <tool> ────────────────────────────────────────────
  if (sub === 'disable' || sub === 'off' || sub === '-') {
    if (!target) return { kind: 'error', text: 'Usage: /plugins disable <tool-name>' }
    if (!SHIPPED_TOOLS.includes(target)) {
      return { kind: 'error', text: `Unknown tool "${target}". Run /plugins list to see available tools.` }
    }
    if (config.disabled.includes(target)) {
      return { kind: 'success', text: `Tool "${target}" is already disabled.` }
    }
    config.disabled.push(target)
    live.disabled.add(target)
    saveConfig(config)
    return {
      kind: 'success',
      text: `Disabled "${target}". Applies immediately; reduced prompt size — the API should be more stable.`,
    }
  }

  // ── /plugins enable <tool> ─────────────────────────────────────────────
  if (sub === 'enable' || sub === 'on' || sub === '+') {
    if (!target) return { kind: 'error', text: 'Usage: /plugins enable <tool-name>' }
    const idx = config.disabled.indexOf(target)
    if (idx === -1) {
      return { kind: 'success', text: `Tool "${target}" is already enabled.` }
    }
    config.disabled.splice(idx, 1)
    live.disabled.delete(target)
    saveConfig(config)
    return {
      kind: 'success',
      text: `Enabled "${target}". Applies immediately.`,
    }
  }

  // ── /plugins reset ─────────────────────────────────────────────────────
  if (sub === 'reset') {
    saveConfig({ disabled: [] })
    live.disabled.clear()
    return { kind: 'success', text: 'All tools re-enabled. Applies immediately.' }
  }

  // ── /plugins preset <name> ─────────────────────────────────────────────
  if (sub === 'preset') {
    return applyPreset(target, config, live.disabled)
  }

  return {
    kind: 'error',
    text: `Unknown subcommand "${sub}". Available: list, ext, enable <tool>, disable <tool>, load <tela|navegador|desktop|jarvis|id>, unload <...>, preset <light|standard|minimal>, reset`,
  }
}

// ── presets ────────────────────────────────────────────────────────────────

const PRESETS: Record<string, readonly string[]> = {
  /** Keep only shell + filesystem + search — minimal token footprint. */
  light: [
    'skill', 'get_goal', 'create_goal', 'update_goal',
    'subagent', 'subagent_fork', 'send_message', 'interrupt_agent', 'list_agents',
    'workflow', 'ralph',
    'ask_user_question', 'todo_write',
    'job_output', 'job_list', 'job_kill',
    'exit_plan_mode',
    'cordis_inspect_list', 'cordis_inspect_query', 'cordis_inspect_self',
    'cordis_define', 'cordis_run', 'cordis_stop', 'cordis_undefine',
    'terminal_open', 'terminal_send', 'terminal_read', 'terminal_signal',
    'terminal_close', 'terminal_list',
    'session_search', 'session_event_search', 'session_trace',
    'session_event_trace', 'session_event_read',
    'desktop_control', 'screen_capture', 'site_explorer', 'browser_navigate',
    'lsp',
    'schedule_create', 'schedule_list', 'schedule_delete',
  ],
  /** Everything enabled (factory default). */
  standard: [],
  /** Only shell + editor (aggressive reduction). */
  minimal: [
    'web_search', 'web_fetch',
    'skill', 'get_goal', 'create_goal', 'update_goal',
    'subagent', 'subagent_fork', 'send_message', 'interrupt_agent', 'list_agents',
    'workflow', 'ralph',
    'ask_user_question', 'todo_write',
    'job_output', 'job_list', 'job_kill',
    'exit_plan_mode',
    'cordis_inspect_list', 'cordis_inspect_query', 'cordis_inspect_self',
    'cordis_define', 'cordis_run', 'cordis_stop', 'cordis_undefine',
    'terminal_open', 'terminal_send', 'terminal_read', 'terminal_signal',
    'terminal_close', 'terminal_list',
    'session_search', 'session_event_search', 'session_trace',
    'session_event_trace', 'session_event_read',
    'desktop_control', 'screen_capture', 'site_explorer', 'browser_navigate',
    'lsp',
    'schedule_create', 'schedule_list', 'schedule_delete',
    'read_image', 'glob', 'grep',
  ],
}

function applyPreset(name: string, config: PluginsConfig, live: Set<string>): CommandResult {
  const disabled = PRESETS[name]
  if (disabled === undefined) {
    return {
      kind: 'error',
      text: `Unknown preset "${name}". Available: ${Object.keys(PRESETS).join(', ')}`,
    }
  }
  config.disabled = [...disabled]
  saveConfig(config)
  live.clear()
  for (const tool of disabled) live.add(tool)
  const count = disabled.length
  return {
    kind: 'success',
    text: `Preset "${name}" applied: ${count} tool${count === 1 ? '' : 's'} disabled. Applies immediately.`,
  }
}

// ── rendering ──────────────────────────────────────────────────────────────

function renderList(config: PluginsConfig, loaded: readonly string[]): CommandResult {
  const lines: string[] = ['**Tools status:**\n']
  for (const [group, tools] of Object.entries(TOOL_GROUPS)) {
    lines.push(`**${group}:**`)
    for (const tool of tools) {
      const on = !config.disabled.includes(tool)
      lines.push(`  ${on ? '[x]' : '[ ]'} ${tool}`)
    }
    lines.push('')
  }
  lines.push(`**${config.disabled.length}** tool(s) disabled.`)
  lines.push('')
  lines.push(renderExtensionsStatus(loaded))
  lines.push('')
  lines.push('Commands: `/plugins disable <name>`, `/plugins enable <name>`, `/plugins preset light|standard|minimal`, `/plugins reset`, `/plugins load <tela|navegador|desktop|jarvis|id>`, `/plugins unload <...>`, `/plugins ext`')
  return { kind: 'success', text: lines.join('\n') }
}

// ── lazy extensions (Jarvis senses, mounted after open) ────────────────────
//
// These workspace packages are NOT boot rows: the core always opens clean,
// and the user mounts them afterwards with `/plugins load`. Each mounts in
// its own fiber; a failure rejects only that fiber and is reported as the
// command result — the app keeps running (fault isolation).

/** A runtime-mountable extension package. */
interface ExtensionDef {
  /** Workspace package specifier, resolved through tsconfig paths at runtime. */
  spec: string
  /** 'service' = default-exported Service class; 'tool' = name/inject/apply shape. */
  kind: 'service' | 'tool'
  /** Other extension ids mounted first, in order. */
  deps: readonly string[]
  /** Config passed to ctx.plugin (mirrors each package's schema defaults). */
  config: Record<string, unknown>
  /** Model tool names this extension contributes (auto-enabled on load). */
  tools: readonly string[]
  /** One-line description for /plugins ext. */
  blurb: string
}

const EXTENSIONS: Record<string, ExtensionDef> = {
  'screen-capture': {
    spec: '@deepseek-ai/dsh-screen-capture',
    kind: 'service',
    deps: [],
    config: {},
    tools: [],
    blurb: 'shared screen handle (Jarvis eyes)',
  },
  'tool-screen': {
    spec: '@deepseek-ai/dsh-tool-screen',
    kind: 'tool',
    deps: ['screen-capture'],
    config: { maxOutputChars: 8000 },
    tools: ['screen_capture'],
    blurb: 'screen_capture model tool',
  },
  browser: {
    spec: '@deepseek-ai/dsh-browser',
    kind: 'service',
    deps: [],
    config: {},
    tools: [],
    blurb: 'CDP tab handle (Jarvis hands, browser)',
  },
  'tool-browser': {
    spec: '@deepseek-ai/dsh-tool-browser',
    kind: 'tool',
    deps: ['browser'],
    config: { maxOutputChars: 12000 },
    tools: ['site_explorer'],
    blurb: 'site_explorer model tool',
  },
  'tool-desktop-control': {
    spec: '@deepseek-ai/dsh-tool-desktop-control',
    kind: 'tool',
    deps: [],
    config: { enabled: true },
    tools: ['desktop_control'],
    blurb: 'desktop_control model tool (gated + audited)',
  },
}

/** Named bundles: one word loads a whole sense. */
const EXTENSION_GROUPS: Record<string, readonly string[]> = {
  tela: ['screen-capture', 'tool-screen'],
  navegador: ['browser', 'tool-browser'],
  desktop: ['tool-desktop-control'],
  jarvis: ['screen-capture', 'tool-screen', 'browser', 'tool-browser', 'tool-desktop-control'],
}

/** Model-tool names accepted as load targets, mapped to extension ids. */
const TOOL_TO_EXTENSION: Record<string, string> = {
  screen_capture: 'tool-screen',
  site_explorer: 'tool-browser',
  desktop_control: 'tool-desktop-control',
}

/** Live extension fibers, by extension id. Owned by the loader closure. */
interface LoadedFiber {
  dispose(): void
}

/** First line of an error, so one broken extension never floods the chat. */
function shortError(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error)
  return text.split('\n')[0] ?? text
}

interface ExtensionLoader {
  load(ids: readonly string[]): Promise<string[]>
  unload(ids: readonly string[]): Promise<string[]>
  loadedIds(): string[]
}

/**
 * Mount extensions on demand in isolated fibers. Created once in apply();
 * the fibers are children of the host root, so tools and services register
 * globally and later prompts pick them up.
 * @param ctx - host context the extension fibers hang under.
 * @param disabled - live disabled-tool set; loading auto-enables its tools.
 */
function createExtensionLoader(ctx: Context, disabled: Set<string>): ExtensionLoader {
  const fibers = new Map<string, LoadedFiber>()
  const inflight = new Map<string, Promise<boolean>>()

  async function loadOne(id: string, lines: string[]): Promise<boolean> {
    if (fibers.has(id)) {
      lines.push(`- ${id}: already loaded.`)
      return true
    }
    const running = inflight.get(id)
    if (running !== undefined) return running
    const task = mountOne(id, lines)
    inflight.set(id, task)
    try {
      return await task
    } finally {
      inflight.delete(id)
    }
  }

  async function mountOne(id: string, lines: string[]): Promise<boolean> {
    if (fibers.has(id)) return true
    const def = EXTENSIONS[id]
    if (def === undefined) {
      lines.push(`- ${id}: unknown extension.`)
      return false
    }
    for (const dep of def.deps) {
      if (!(await loadOne(dep, lines))) {
        lines.push(`- ${id}: skipped (dependency "${dep}" failed).`)
        return false
      }
    }
    try {
      const mod = (await import(def.spec)) as Record<string, unknown>
      if (def.kind === 'service') {
        if (typeof mod.default !== 'function') {
          throw new Error(`package ${def.spec} exports no default Service class`)
        }
        fibers.set(id, await ctx.plugin(mod.default as Plugin.Constructor))
      } else {
        if (typeof mod.apply !== 'function') {
          throw new Error(`package ${def.spec} exports no apply function`)
        }
        const shape: Plugin.Object = {
          apply: mod.apply as Plugin.Object['apply'],
        }
        if (typeof mod.name === 'string') shape.name = mod.name
        if (mod.inject !== undefined) {
          shape.inject = mod.inject as Exclude<Plugin.Object['inject'], undefined>
        }
        if (mod.Config !== undefined) {
          shape.Config = mod.Config as Exclude<Plugin.Object['Config'], undefined>
        }
        fibers.set(id, await ctx.plugin(shape, { ...def.config }))
      }
      lines.push(`- ${id}: loaded.`)
    } catch (error) {
      lines.push(`- ${id}: FAILED — ${shortError(error)} (Hermes keeps running.)`)
      return false
    }
    // Loading means wanting: drop its tools from the disabled set (live + persisted).
    let touched = false
    for (const tool of def.tools) {
      if (disabled.delete(tool)) touched = true
    }
    if (touched) {
      saveConfig({ disabled: [...disabled] })
      lines.push(`  (tools ${def.tools.join(', ')} re-enabled.)`)
    }
    return true
  }

  return {
    async load(ids: readonly string[]): Promise<string[]> {
      const lines = ['**Extensions load:**']
      let ok = true
      for (const id of ids) {
        if (!(await loadOne(id, lines))) ok = false
      }
      lines.push(ok ? 'Done. The agent can use the new tools from the next turn.' : 'Some extensions failed — see above. Hermes keeps running.')
      return lines
    },
    async unload(ids: readonly string[]): Promise<string[]> {
      const lines = ['**Extensions unload:**']
      const seen = new Set<string>()
      for (const id of ids) {
        await unloadOne(id, lines, seen)
      }
      return lines
    },
    loadedIds(): string[] {
      return [...fibers.keys()]
    },
  }

  /** Unload loaded dependents first (depth-first), then the extension itself. */
  async function unloadOne(id: string, lines: string[], seen: Set<string>): Promise<void> {
    if (seen.has(id)) return
    seen.add(id)
    if (!fibers.has(id)) {
      lines.push(`- ${id}: not loaded.`)
      return
    }
    for (const other of Object.keys(EXTENSIONS)) {
      const otherDef = EXTENSIONS[other]
      if (other !== id && fibers.has(other) && otherDef !== undefined && otherDef.deps.includes(id)) {
        await unloadOne(other, lines, seen)
      }
    }
    const fiber = fibers.get(id)
    fibers.delete(id)
    if (fiber !== undefined) await fiber.dispose()
    lines.push(`- ${id}: unloaded.`)
  }
}

/**
 * Resolve a load/unload target to extension ids: group alias, extension id,
 * or model tool name.
 */
function resolveExtensionTargets(target: string): readonly string[] | undefined {
  const t = target.toLowerCase()
  if (EXTENSION_GROUPS[t] !== undefined) return EXTENSION_GROUPS[t]
  if (EXTENSIONS[t] !== undefined) return [t]
  const byTool = TOOL_TO_EXTENSION[t]
  if (byTool !== undefined) return [byTool]
  return undefined
}

function renderExtensionsStatus(loaded: readonly string[]): string {
  const parts = Object.keys(EXTENSIONS).map(id => `${loaded.includes(id) ? '[x]' : '[ ]'} ${id}`)
  return `**Extensions:** ${parts.join('  ')}\nGroups: ${Object.keys(EXTENSION_GROUPS).join(', ')}`
}

async function runExtensionCommand(
  loader: ExtensionLoader,
  sub: string,
  target: string,
): Promise<CommandResult> {
  if (sub === 'ext') {
    const lines = ['**Extensions (loaded after open, never at boot):**\n']
    const loaded = loader.loadedIds()
    for (const [id, def] of Object.entries(EXTENSIONS)) {
      lines.push(`  ${loaded.includes(id) ? '[x]' : '[ ]'} ${id} — ${def.blurb}`)
    }
    lines.push('')
    lines.push(`Groups: ${Object.keys(EXTENSION_GROUPS).join(', ')}`)
    lines.push('Usage: `/plugins load <tela|navegador|desktop|jarvis|id>`, `/plugins unload <...>`')
    return { kind: 'success', text: lines.join('\n') }
  }
  if (!target) {
    return { kind: 'error', text: `Usage: /plugins ${sub} <tela|navegador|desktop|jarvis|extension-id>` }
  }
  const ids = resolveExtensionTargets(target)
  if (ids === undefined) {
    return { kind: 'error', text: `Unknown extension "${target}". Run /plugins ext to see available ones.` }
  }
  const lines = sub === 'load' ? await loader.load(ids) : await loader.unload(ids)
  return { kind: 'success', text: lines.join('\n') }
}

// ── guard + prompt filtering wiring ────────────────────────────────────────

/**
 * Register the `/plugins` command, a global tool guard that denies
 * disabled tools at execution time, and a `system-prompt/assemble`
 * waterfall listener that strips disabled tool schemas from the prompt
 * so they never reach the LLM — saving tokens and reducing API overload.
 * The same command also mounts the Jarvis extensions on demand
 * (`load`/`unload`), each in its own isolated fiber.
 */
export function apply(ctx: Context): void {
  // Live tool state: mutated by disable/enable/preset/reset/load immediately
  // (no restart needed); persisted to ~/.dsh/plugins.json on every change.
  const disabled = new Set(loadConfig().disabled)
  const loader = createExtensionLoader(ctx, disabled)

  // Tools contributed by loaded extensions bypass the disabled set: loading
  // means wanting, even if a preset disabled them at boot.
  const loadedTools = (): Set<string> => {
    const names = new Set<string>()
    for (const id of loader.loadedIds()) {
      const def = EXTENSIONS[id]
      if (def !== undefined) for (const tool of def.tools) names.add(tool)
    }
    return names
  }

  // Register the command
  ctx.commands.register({
    name: 'plugins',
    description: 'enable/disable tools to reduce prompt size; load/unload Jarvis extensions (tela, navegador, desktop) after open',
    input: { hint: '[list|ext|enable <tool>|disable <tool>|load <tela|navegador|desktop|jarvis|id>|unload <...>|preset <light|standard|minimal>|reset]' },
    handler: (invocation: CommandInvocation): CommandResult | Promise<CommandResult> => {
      const sub = (invocation.rawInput.trim().split(/\s+/)[0] ?? '').toLowerCase()
      if (sub === 'load' || sub === 'unload' || sub === 'ext' || sub === 'extensions') {
        const target = (invocation.rawInput.trim().split(/\s+/)[1] ?? '').toLowerCase()
        return runExtensionCommand(loader, sub, target)
      }
      return handlePlugins(invocation.rawInput, { disabled, loaded: loader.loadedIds() })
    },
  })

  // 1) Guard: block execution of disabled tools (loaded extensions win).
  const guard: ToolGuard = (exec) => {
    if (loadedTools().has(exec.name)) return undefined
    if (disabled.has(exec.name)) {
      return `Tool "${exec.name}" is disabled. Use /plugins enable ${exec.name} to re-enable it.`
    }
    return undefined
  }
  ctx.tools.guard(guard)

  // 3) Super Autônomo: when a session on that preset is created, mount the
  //    Jarvis senses afterwards (never at boot). Fire-and-forget with its own
  //    catch: a failure is logged, the session keeps running.
  ctx.on('session/created', (session) => {
    if (session?.header?.agentPreset !== 'super-autonomous') return
    const senses = EXTENSION_GROUPS.jarvis
    if (senses === undefined) return
    void loader.load(senses).then(
      (lines) => { ctx.logger.info(`super-autonomous senses: ${lines.join(' | ')}`) },
      (error: unknown) => { ctx.logger.warn(`super-autonomous senses failed: ${shortError(error)}`) },
    )
  }, { global: true })
}
