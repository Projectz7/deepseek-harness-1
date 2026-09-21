import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { ScreenPicker } from './Picker.tsx'

export const name = 'ui-screen-picker'

export const inject = ['slots', 'locale']

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    screenPicker: ScreenPickerKey
  }
}

type ScreenPickerKey = 'title' | 'sharing' | 'share' | 'error' | 'hint'

export const apply = (ctx: ClientContext): void => {
  const { slots, locale } = ctx
  locale.register('screenPicker', {
    zh: {
      title: 'Compartilhar tela',
      sharing: 'Compartilhando — clique para trocar',
      share: 'Compartilhar aba (Site Explorer)',
      error: 'Erro ao compartilhar',
      hint: 'Selecione uma aba ou janela para capturar',
    },
    en: {
      title: 'Share Screen',
      sharing: 'Sharing — click to switch',
      share: 'Share Tab (Site Explorer)',
      error: 'Share error',
      hint: 'Select a tab or window to capture',
    },
  })

  slots.inject('conversation.input.dock', () => slots.register({
    name: 'conversation.input.dock',
    id: 'screen-picker',
    order: 11,
    locale: 'screenPicker',
  }, ScreenPicker))
}
