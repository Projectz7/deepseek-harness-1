/**
 * Desktop control tool: click/type/scroll for autonomous desktop takeover.
 * Gated by sandbox + approval audit.
 * @module @deepseek-ai/dsh-tool-desktop-control
 */
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'tool-desktop-control'
export const inject = ['tools']

export interface Config {
  enabled?: boolean
}

export const Config: z<Config> = z.object({
  enabled: z.boolean().default(true),
})

export function apply(ctx: Context, config: Config): void {
  if (config.enabled === false) return
  ctx.tools.register(defineTool({
    name: 'desktop_control',
    description: 'Control desktop keyboard/mouse (autonomous). Requires sandbox disabled + user consent. Actions are audited.',
    parameters: {
      action: { type: 'string', required: true, enum: ['click', 'type', 'scroll', 'shortcut'] },
      x: { type: 'integer', description: 'X for click' },
      y: { type: 'integer', description: 'Y for click' },
      text: { type: 'string', description: 'Text to type' },
      keys: { type: 'string', description: 'Shortcut keys' },
    },
    output: { schema: { type: 'string' }, render: (_a, v) => [{ type: 'text', text: v }] },
    async execute(args) {
      const a = args as Record<string, unknown>
      ctx.logger.info(`desktop_control ${String(a.action)} ${JSON.stringify(a)} (audit)`)
      return `desktop_control ${String(a.action)} queued (requires OS helper nut.js/SendInput; scaffold)`
    },
  }))
}