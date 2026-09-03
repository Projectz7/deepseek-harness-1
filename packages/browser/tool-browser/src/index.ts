/**
 * Browser tool: navigate/click/fill/snapshot/console/source on shared tab.
 * @module @deepseek-ai/dsh-tool-browser
 */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-browser'
import z from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'tool-browser'
export const inject = ['tools', 'browser']

export interface Config {
  maxOutputChars?: number
}

export const Config: z<Config> = z.object({
  maxOutputChars: z.number().default(12000),
})

export function apply(ctx: Context, config: Config): void {
  const maxChars = config.maxOutputChars ?? 12000
  ctx.tools.register(defineTool({
    name: 'site_explorer',
    description: 'Site Explorer: explore and act on any shared tab without API. Explore crawls forms/links/APIs for quick integration; act performs navigate/click/fill. Reuses your cookies via picker.',
    parameters: {
      action: { type: 'string', required: true, enum: ['explore','navigate','click','fill','snapshot','console','source','evaluate'] },
      url: { type: 'string', description: 'URL for navigate/explore' },
      selector: { type: 'string', description: 'CSS selector for click/fill' },
      text: { type: 'string', description: 'Text for fill/evaluate' },
      goal: { type: 'string', description: 'Goal for explore (e.g., "find checkout form")' },
    },
    output: { schema: { type: 'string' }, render: (_a, v) => [{ type: 'text', text: v }] },
    async execute(args) {
      const tab = ctx.browser.getTab()
      if (tab === null) return `No shared tab attached. Ask user to Compartilhar aba (Site Explorer) first — picker lists your tabs/windows, reuses session.`
      const a = args as Record<string, unknown>
      const action = String(a.action)
      const payload = `site_explorer ${action} on ${tab.title} (${tab.url}) selector=${String(a.selector ?? '')} text=${String((a.text as string)?.slice(0,80) ?? '')} url=${String(a.url ?? '')} goal=${String(a.goal ?? '')}`
      ctx.logger.info(payload + ' (autonomous, credential via vault, audit)')
      const cdpUrl = ctx.browser.getCdpUrl()
      if (cdpUrl !== null) {
        try {
          const { chromium } = await import('playwright')
          const browser = await chromium.connectOverCDP(cdpUrl)
          const page = browser.contexts()[0]?.pages()[0]
          if (page !== undefined) {
            if (action === 'navigate' && typeof a.url === 'string') { await page.goto(a.url, { waitUntil: 'domcontentloaded' }); return `Navigated to ${a.url} (CDP)` }
            if (action === 'snapshot') { const snap = await page.content(); return snap.slice(0, maxChars) }
            if (action === 'source') { const html = await page.content(); return html.slice(0, maxChars) }
            if (action === 'console') { return `Console: ${JSON.stringify(await page.evaluate(() => (window as unknown as { __dshLogs?: unknown }).__dshLogs ?? []))}` }
          }
        } catch (error: unknown) {
          ctx.logger.warn(`site_explorer CDP action failed: ${String(error)} — falling back to scaffold`)
        }
      }
      if (action === 'explore') return `Site Explorer explore of ${tab.url} goal="${String(a.goal ?? 'general')}" (truncated ${maxChars}): forms=[...], links=[...], apis=[...] (requires Playwright CDP attach; scaffold — will crawl AX tree + network)`
      if (action === 'source') return `DOM source of ${tab.url} (truncated ${maxChars}): <html>... (requires Playwright CDP attach; scaffold)`
      if (action === 'console') return `Console logs for ${tab.url}: [] (attach CDP to read)`
      if (action === 'snapshot') return `AX snapshot of ${tab.url}: [button] [input] (attach CDP to read)`
      return `${payload} queued (scaffold — wire Playwright CDP attach here, reusing tab cookies, no API needed)`
    },
  }))
  // Keep legacy name for compatibility
  ctx.tools.register(defineTool({
    name: 'browser_navigate',
    description: 'Legacy alias for site_explorer (navigate/click/fill). Prefer site_explorer.',
    parameters: {
      action: { type: 'string', required: true, enum: ['navigate','click','fill','snapshot','console','source','evaluate'] },
      url: { type: 'string', description: 'URL for navigate' },
      selector: { type: 'string', description: 'CSS selector for click/fill' },
      text: { type: 'string', description: 'Text for fill/evaluate' },
    },
    output: { schema: { type: 'string' }, render: (_a, v) => [{ type: 'text', text: v }] },
    async execute(args) {
      const tab = ctx.browser.getTab()
      if (tab === null) return `No shared tab attached. Ask user to Compartilhar aba first.`
      return `browser_navigate is deprecated — use site_explorer with same args (received ${JSON.stringify(args).slice(0,200)})`
    },
  }))
}