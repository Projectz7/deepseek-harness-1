/**
 * Browser service: holds CDP-attached tab handle for autonomous navigation.
 * @module @deepseek-ai/dsh-browser
 */
import { Service, type Context } from '@deepseek-ai/cordis'

export interface BrowserTabHandle {
  targetId: string
  url: string
  title: string
}

export class BrowserService extends Service {
  private tab: BrowserTabHandle | null = null

  constructor(ctx: Context) {
    super(ctx, 'browser')
  }

  attach(tab: BrowserTabHandle): void { this.tab = tab }
  detach(): void { this.tab = null }
  getTab(): BrowserTabHandle | null { return this.tab }
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    browser: BrowserService
  }
}

export const name = 'browser'
export function apply(ctx: Context): void {
  ctx.provide('browser', new BrowserService(ctx))
}