/**
 * Per-message listen button: reads the assistant reply aloud using the
 * browser's built-in speechSynthesis (free, local, pt-BR). Click toggles:
 * first click starts speech, second click stops it.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { PropsRuntime, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { IconPlayOutline16, IconStopFill16 } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './ListenButton.module.css'

export type ListenButtonProps =
  PropsRuntime<'conversation.chat.assistant-actions'>
  & { messageId: string }
  & PropsLocale<'listen'>

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  if (voices.length === 0) return null
  const ptBR = voices.find((v) => v.lang === 'pt-BR' || v.lang === 'pt_BR')
  if (ptBR !== undefined) return ptBR
  const pt = voices.find((v) => v.lang.startsWith('pt'))
  if (pt !== undefined) return pt
  return voices[0] ?? null
}

export function ListenButton({ messageId, useSession, t }: ListenButtonProps) {
  const [speaking, setSpeaking] = useState(false)
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null)

  const stop = useCallback(() => {
    window.speechSynthesis.cancel()
    setSpeaking(false)
    utterRef.current = null
  }, [])

  useEffect(() => { return () => { window.speechSynthesis.cancel() } }, [])

  const extractText = useCallback((): string => {
    const snap = useSession((s) => s)
    if (snap === undefined) return ''
    const nodes = snap.nodes
    if (nodes === undefined) return ''
    for (const node of Object.values(nodes)) {
      if (node.kind !== 'assistant') continue
      // The slot's messageId comes from the `assistant/message` event; the
      // node carries it in a property typed per the conversation contract.
      const asst = node as { messageId?: string; blocks?: ReadonlyArray<{ kind: string; text?: string }> }
      if (asst.messageId !== messageId) continue
      const blocks = asst.blocks
      if (blocks === undefined) return ''
      return blocks
        .filter((b) => b.kind === 'text' && typeof b.text === 'string')
        .map((b) => (b as { text: string }).text)
        .join(' ')
        .trim()
    }
    return ''
  }, [messageId, useSession])

  const onClick = useCallback(() => {
    if (speaking) { stop(); return }
    const text = extractText()
    if (text === '') return
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'pt-BR'
    utter.rate = 1.0
    const voice = pickVoice()
    if (voice !== null) { utter.voice = voice; utter.lang = voice.lang }
    utter.onend = () => { setSpeaking(false); utterRef.current = null }
    utter.onerror = () => { setSpeaking(false); utterRef.current = null }
    utterRef.current = utter
    window.speechSynthesis.speak(utter)
    setSpeaking(true)
  }, [speaking, extractText, stop])

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null

  return (
    <button
      type="button"
      className={[css.listenButton, speaking ? css.speaking : ''].filter(Boolean).join(' ')}
      aria-label={speaking ? t('stop') : t('listen')}
      title={speaking ? t('stop') : t('listen')}
      onClick={onClick}
    >
      {speaking
        ? <IconStopFill16 className={css.icon} />
        : <IconPlayOutline16 className={css.icon} />}
    </button>
  )
}
