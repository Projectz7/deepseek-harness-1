import { describe, expect, it, vi } from 'vitest'
import { apply } from '../src/index.ts'

describe('auto-approve', () => {
  it('registers approval/request handler that allows', async () => {
    const handlers: Array<(req: unknown, next: () => Promise<unknown>) => Promise<unknown>> = []
    const ctx: unknown = { on: (event: string, fn: typeof handlers[number]) => { if (event === 'approval/request') handlers.push(fn) } }
    apply(ctx as any)
    expect(handlers).toHaveLength(1)
    const result = await handlers[0]!({}, async () => 'unavailable')
    expect(result).toBe('allowed-once')
  })

  it('does not register when disabled', () => {
    const on = vi.fn()
    apply({ on } as any, { enabled: false })
    expect(on).not.toHaveBeenCalled()
  })
})