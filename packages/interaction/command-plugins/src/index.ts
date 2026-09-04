/**
 * Human-facing `/plugins` command: enable or disable tools at runtime to reduce
 * prompt size for rate-limited APIs (e.g. DeepSeek Free). Disabled tools are
 * denied by a global `tools.guard()` AND filtered from the system prompt so
 * their schemas never reach the LLM — saving tokens and reducing overload.
 *
 * State persists to `~/.dsh/plugins.json`.
 * @module @deepseek-ai/dsh-command-plugins
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import type { Context } from '@deepseek-ai/cordis'
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

function handlePlugins(rawInput: string): CommandResult {
  const parts = rawInput.trim().split(/\s+/)
  const sub = (parts[0] ?? '').toLowerCase()
  const target = (parts[1] ?? '').toLowerCase()

  const config = loadConfig()

  // ── /plugins (no args) or /plugins list ────────────────────────────────
  if (sub === '' || sub === 'list') {
    return renderList(config)
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
    saveConfig(config)
    return {
      kind: 'success',
      text: `Disabled "${target}". Restart the session or type /plugins list to verify.\nReduced prompt size — the API should be more stable.`,
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
    saveConfig(config)
    return {
      kind: 'success',
      text: `Enabled "${target}". Restart the session or type /plugins list to verify.`,
    }
  }

  // ── /plugins reset ─────────────────────────────────────────────────────
  if (sub === 'reset') {
    saveConfig({ disabled: [] })
    return { kind: 'success', text: 'All tools re-enabled. Restart the session to apply.' }
  }

  // ── /plugins preset <name> ─────────────────────────────────────────────
  if (sub === 'preset') {
    return applyPreset(target, config)
  }

  return {
    kind: 'error',
    text: `Unknown subcommand "${sub}". Available: list, enable <tool>, disable <tool>, preset <light|standard|minimal>, reset`,
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

function applyPreset(name: string, config: PluginsConfig): CommandResult {
  const disabled = PRESETS[name]
  if (disabled === undefined) {
    return {
      kind: 'error',
      text: `Unknown preset "${name}". Available: ${Object.keys(PRESETS).join(', ')}`,
    }
  }
  config.disabled = [...disabled]
  saveConfig(config)
  const count = disabled.length
  return {
    kind: 'success',
    text: `Preset "${name}" applied: ${count} tool${count === 1 ? '' : 's'} disabled. Restart the session to apply.`,
  }
}

// ── rendering ──────────────────────────────────────────────────────────────

function renderList(config: PluginsConfig): CommandResult {
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
  lines.push('Commands: `/plugins disable <name>`, `/plugins enable <name>`, `/plugins preset light|standard|minimal`, `/plugins reset`')
  return { kind: 'success', text: lines.join('\n') }
}

// ── guard + prompt filtering wiring ────────────────────────────────────────

/**
 * Register the `/plugins` command, a global tool guard that denies
 * disabled tools at execution time, and a `system-prompt/assemble`
 * waterfall listener that strips disabled tool schemas from the prompt
 * so they never reach the LLM — saving tokens and reducing API overload.
 */
export function apply(ctx: Context): void {
  // Register the command
  ctx.commands.register({
    name: 'plugins',
    description: 'enable or disable tools to reduce prompt size for rate-limited APIs',
    input: { hint: '[list|enable <tool>|disable <tool>|preset <light|standard|minimal>|reset]' },
    handler: (invocation: CommandInvocation): CommandResult =>
      handlePlugins(invocation.rawInput),
  })

  const config = loadConfig()
  const disabledSet = new Set(config.disabled)

  // 1) Guard: block execution of disabled tools
  if (disabledSet.size > 0) {
    const guard: ToolGuard = (exec) => {
      if (disabledSet.has(exec.name)) {
        return `Tool "${exec.name}" is disabled. Use /plugins enable ${exec.name} to re-enable it.`
      }
      return undefined
    }
    ctx.tools.guard(guard)
  }

  // 2) System prompt: strip disabled tool schemas before they reach the LLM.
  //    This is the real token saver — without it, ~50K chars of unused schemas
  //    inflate every API request and trigger DeepSeek Free rate limits.
  if (disabledSet.size > 0) {
    ctx.on('system-prompt/assemble', async (assembly, _context, next) => {
      assembly.tools = assembly.tools.filter(tool => !disabledSet.has(tool.name))
      return next()
    })
  }
}
