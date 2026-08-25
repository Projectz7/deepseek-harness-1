/**
 * Human-facing `/memory` command: read or append to a project memory file
 * (`MEMORY.md`) in the session workspace. Ports Claude Code's durable
 * project-memory concept onto dsh as an additive command plugin.
 * @module @deepseek-ai/dsh-command-memory
 */

import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type { CommandInvocation, CommandResult } from '@deepseek-ai/dsh-commands'

export const name = 'command-memory'
export const inject = ['commands']

/** File name written in the session workspace. */
const MEMORY_FILE = 'MEMORY.md'

/**
 * Pure memory-file operation behind the `/memory` command.
 * @param rawInput - verbatim text after the command name; empty or `show` reads, `clear` empties, any other text appends.
 * @param cwd - session workspace directory; required to locate the memory file.
 * @returns the command outcome for the dispatching UI.
 */
export function runMemory(rawInput: string, cwd: string | undefined): CommandResult {
  if (cwd === undefined) {
    return { kind: 'error', text: 'memory: no workspace directory is available for this session' }
  }
  const file = join(cwd, MEMORY_FILE)
  const input = rawInput.trim()
  if (input === '') return readMemory(file)
  const lower = input.toLowerCase()
  if (lower === 'show') return readMemory(file)
  if (lower === 'clear') {
    writeFileSync(file, '')
    return { kind: 'success', text: 'Memory cleared.' }
  }
  // Any other input is appended as a memory line (Claude Code style).
  const existing = existsSync(file) ? readFileSync(file, 'utf8') : ''
  const prefix = existing.length > 0 && !existing.endsWith('\n') ? '\n' : ''
  appendFileSync(file, `${prefix}${input}\n`)
  return { kind: 'success', text: `Saved to ${MEMORY_FILE}.` }
}

/**
 * Read the memory file for display.
 * @param file - absolute path to the memory file.
 * @returns a success result carrying the content, or an empty notice.
 */
function readMemory(file: string): CommandResult {
  if (!existsSync(file) || readFileSync(file, 'utf8').trim() === '') {
    return { kind: 'success', text: 'Memory is empty.' }
  }
  return { kind: 'success', text: readFileSync(file, 'utf8') }
}

/**
 * Register the `/memory` command for every composed command adapter.
 * @param ctx - Cordis context carrying the command registry.
 */
export function apply(ctx: Context): void {
  ctx.commands.register({
    name: 'memory',
    description: 'read or append to the project memory file (MEMORY.md)',
    input: { hint: '[<text> | show | clear]' },
    handler: (invocation: CommandInvocation): CommandResult =>
      runMemory(invocation.rawInput, invocation.agent.session.header.cwd),
  })
}
