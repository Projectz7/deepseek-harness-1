import type { ClientContext, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the ui-conversation SlotMap merge (the input.right entry).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { VoiceControls } from './VoiceControls.tsx'

export const name = 'ui-voice'

export const inject = ['slots', 'locale', 'sessions']

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    voice: VoiceKey
  }
}

type VoiceKey = 'voice' | 'noMic' | 'denied' | 'nudge' | 'standby'

/** Inject face: the voice loop sends heard speech through the session. */
export interface VoiceActions {
  sendText(text: string): void
}

export const apply = (ctx: ClientContext): void => {
  const { slots, locale, sessions } = ctx
  locale.register('voice', {
    zh: {
      voice: 'Conversa por voz',
      noMic: 'Voz indisponível neste navegador',
      denied: 'Microfone bloqueado. Libere a permissão e tente de novo.',
      nudge: 'Estou ouvindo. Quer que eu detalhe o resultado, avance para a próxima etapa ou tente outra abordagem?',
      standby: 'Vou ficar em espera. Toque no microfone quando precisar.',
    },
    en: {
      voice: 'Voice chat',
      noMic: 'Voice unavailable in this browser',
      denied: 'Microphone blocked. Allow the permission and try again.',
      nudge: 'I am listening. Should I detail the result, move to the next step, or try another approach?',
      standby: 'I will stand by. Tap the microphone when you need me.',
    },
  })

  slots.inject('conversation.input.right', () => slots.register({
    name: 'conversation.input.right',
    id: 'voice',
    order: 5,
    locale: 'voice',
    inject: (sessionId: SessionId): VoiceActions => ({
      sendText: (text: string) => {
        const session = sessions.binding(sessionId)?.session
        if (session === undefined) return
        void session.prompt([{ type: 'text', text }], 'queue')
      },
    }),
  }, VoiceControls))
}
