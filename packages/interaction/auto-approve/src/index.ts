/**
 * Autonomous approval plugin: every `approval/request` is granted without
 * prompting the user, enabling tool and MCP use without interruption. The
 * plugin is additive and a preset mounts it explicitly; it does not change
 * the default approval posture for other presets.
 * @module @deepseek-ai/dsh-auto-approve
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-user-approval'

export const name = 'auto-approve'
export const inject: string[] = []

export interface Config {
  /** When false the plugin does not register its handler; default true. */
  enabled?: boolean
}

export function apply(ctx: Context, config: Config = {}): void {
  if (config.enabled === false) return
  ctx.on('approval/request', () => {
    return Promise.resolve('allowed-once' as const)
  })
}