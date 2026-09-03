/**
 * Model-facing screen capture tool: screenshot/view with region and polling.
 * @module @deepseek-ai/dsh-tool-screen
 */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-screen-capture'
import z from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'tool-screen'
export const inject = ['tools', 'screenCapture']

export interface Config {
  maxOutputChars?: number
}

export const Config: z<Config> = z.object({
  maxOutputChars: z.number().default(8000),
})

export function apply(ctx: Context, config: Config): void {
  const maxChars = config.maxOutputChars ?? 8000
  ctx.tools.register(defineTool({
    name: 'screen_capture',
    description: 'Capture screenshot of the shared tab/window selected via picker (autonomous vision). Use region to crop.',
    parameters: {
      region: { type: 'string', description: 'Optional region x,y,w,h' },
      pollIntervalMs: { type: 'integer', description: 'Poll interval for streaming' },
    },
    output: { schema: { type: 'string' }, render: (_a, v) => [{ type: 'text', text: v }] },
    async execute(args) {
      const handle = ctx.screenCapture.getHandle()
      if (handle === null) return `No shared tab/window selected. Ask user to pick a tab via Compartilhar aba.`
      const preview = `Screenshot of ${handle.kind} "${handle.label}" region=${(args as Record<string, unknown>).region ?? 'all'} (${maxChars} chars cap)`
      return preview.slice(0, maxChars)
    },
  }))
}