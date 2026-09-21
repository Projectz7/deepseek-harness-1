import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { ScreenHandle } from '@deepseek-ai/dsh-screen-capture'
import { ScreenStatus } from './ScreenStatus.tsx'

export const name = 'ui-screen-status'

export const inject = ['slots', 'screenCapture', 'locale']

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    screen: ScreenKey
  }
}

type ScreenKey = 'capturing' | 'none' | 'hint' | 'kind.tab' | 'kind.window' | 'kind.screen'

export const apply = (ctx: ClientContext): void => {
  const { slots, screenCapture, locale } = ctx
  locale.register('screen', {
    zh: {
      capturing: 'Capturando',
      none: 'Nenhuma tela compartilhada',
      hint: 'Use "Compartilhar aba" para selecionar',
      'kind.tab': 'Aba do navegador',
      'kind.window': 'Janela',
      'kind.screen': 'Tela inteira',
    },
    en: {
      capturing: 'Capturing',
      none: 'No screen shared',
      hint: 'Use "Share tab" to select',
      'kind.tab': 'Browser tab',
      'kind.window': 'Window',
      'kind.screen': 'Full screen',
    },
  })

  slots.inject('conversation.input.dock', () => slots.register({
    name: 'conversation.input.dock',
    id: 'screen-status',
    order: 12,
    locale: 'screen',
    inject: (): { handle: ScreenHandle | null } => ({
      handle: screenCapture.getHandle(),
    }),
  }, ScreenStatus))
}
