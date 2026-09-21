import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { BrowserTabHandle } from '@deepseek-ai/dsh-browser'
import { BrowserTab } from './BrowserTab.tsx'

export const name = 'ui-browser-tab'

export const inject = ['slots', 'locale', 'browser']

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    browser: BrowserKey
  }
}

type BrowserKey = 'tab' | 'connect' | 'detach' | 'hint' | 'connecting'

interface BrowserTabInjected {
  tab: BrowserTabHandle | null
  cdpUrl: string | null
  onAttach: (url: string) => Promise<BrowserTabHandle>
  onDetach: () => void
}

export const apply = (ctx: ClientContext): void => {
  const { slots, locale, browser } = ctx
  locale.register('browser', { zh: { tab: 'Aba', connect: 'Conectar', detach: 'Desconectar', hint: 'Cole a URL do CDP (ex: http://localhost:9222)', connecting: 'Conectando...' }, en: { tab: 'Tab', connect: 'Connect', detach: 'Detach', hint: 'Paste CDP URL (e.g. http://localhost:9222)', connecting: 'Connecting...' } })

  slots.inject('conversation.input.dock', () => slots.register({
    name: 'conversation.input.dock',
    id: 'browser-tab',
    order: 13,
    locale: 'browser',
    inject: (): BrowserTabInjected => ({
      tab: browser.getTab(),
      cdpUrl: browser.getCdpUrl(),
      onAttach: (url: string) => browser.attachViaCdp(url),
      onDetach: () => browser.detach(),
    }),
  }, BrowserTab))
}
