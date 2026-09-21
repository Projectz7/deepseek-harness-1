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
  private cdpUrl: string | null = null

  constructor(ctx: Context) {
    super(ctx, 'browser')
  }

  attach(tab: BrowserTabHandle): void { this.tab = tab }
  detach(): void { this.tab = null; this.cdpUrl = null }
  getTab(): BrowserTabHandle | null { return this.tab }

  setCdpUrl(url: string | null): void { this.cdpUrl = url }
  getCdpUrl(): string | null { return this.cdpUrl }

  async attachViaCdp(cdpUrl: string): Promise<BrowserTabHandle> {
    this.cdpUrl = cdpUrl
    try {
      const { chromium } = await import('playwright')
      const browser = await chromium.connectOverCDP(cdpUrl)
      const contexts = browser.contexts()
      const page = contexts[0]?.pages()[0]
      if (page === undefined) throw new Error('No page found via CDP')
      const handle: BrowserTabHandle = { targetId: cdpUrl, url: page.url(), title: await page.title().catch(() => cdpUrl) }
      this.tab = handle
      return handle
    } catch (error: unknown) {
      const handle: BrowserTabHandle = { targetId: cdpUrl, url: cdpUrl, title: `CDP ${cdpUrl}` }
      this.tab = handle
      this.ctx.logger.warn(`browser: CDP attach fallback for ${cdpUrl}: ${String(error)}`)
      return handle
    }
  }
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    browser: BrowserService
  }
}

/**
 * Service plugin entry. The default-exported Service self-provides
 * `browser` from its constructor — no manual `ctx.provide()` in an
 * apply body (that registers the same name twice and fails boot).
 */
export default BrowserService
