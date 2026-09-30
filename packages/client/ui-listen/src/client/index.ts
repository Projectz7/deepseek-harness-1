/**
 * Listen-button plugin: registers a speechSynthesis read-aloud button
 * into the assistant-message action strip (conversation.chat.assistant-actions).
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { ListenButton } from './ListenButton.tsx'
import { en, zh, NS, type ListenKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'listen': ListenKey
  }
}

export type { ListenButton, ListenButtonProps } from './ListenButton.tsx'
export type { ListenKey } from './locales.ts'

export const inject = ['slots', 'locale']

export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-listen: dictionaries')
  ctx.slots.inject(
    'conversation.chat.assistant-actions',
    () => ctx.slots.register({
      name: 'conversation.chat.assistant-actions',
      id: 'listen',
      order: 5,
      locale: NS,
    }, ListenButton),
  )
}
