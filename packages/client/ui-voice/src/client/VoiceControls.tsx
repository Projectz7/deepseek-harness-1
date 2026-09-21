import { useCallback, useEffect, useRef, useState } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
// Type-only: pulls the ui-conversation SlotMap merge (the input.right entry).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type { VoiceActions } from './index.ts'
import styles from './VoiceControls.module.css'
import {
  extractFalaLine,
  lastAssistantText,
  recognitionConstructor,
  speak,
  stopSpeaking,
  voiceSupported,
  type VoiceRecognition,
} from './speech.ts'

export type VoiceControlsProps = PropsRuntime<'conversation.input.right'>
  & InjectFace<VoiceActions>
  & PropsLocale<'voice'>

/** Silent rounds before the loop stands by instead of nudging again. */
const MAX_SILENCE_ROUNDS = 2

/**
 * Voice conversation toggle in the composer tool row. When on, every
 * finished turn speaks its `Fala:` digest (outcome + one question, never
 * reasoning), then the mic opens automatically; heard speech is sent as
 * the next message. Silence gets one spoken nudge with options, then the
 * loop stands by instead of spinning forever.
 */
export function VoiceControls(props: VoiceControlsProps) {
  const { useSession, sendText, t } = props
  const running = useSession(s => s.running)
  const lastText = useSession(s => lastAssistantText(s.nodes))

  const [voiceOn, setVoiceOn] = useState(false)
  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking] = useState(false)

  const voiceOnRef = useRef(false)
  const recRef = useRef<VoiceRecognition | null>(null)
  const stopRef = useRef(false)
  const roundsRef = useRef(0)
  const prevRunningRef = useRef(false)
  const spokenRef = useRef('')
  const liveRef = useRef({ sendText, t })
  useEffect(() => {
    liveRef.current = { sendText, t }
  })

  const stopRecognition = useCallback((): void => {
    const rec = recRef.current
    recRef.current = null
    if (rec !== null) {
      // Ignore the trailing onend this stop produces.
      stopRef.current = true
      try {
        rec.stop()
      } catch {
        // Already stopped between rounds; the flag above covers the echo.
      }
    }
    setListening(false)
  }, [])

  const speakDigest = useCallback((text: string, after: () => void): void => {
    setSpeaking(true)
    speak(text, () => {
      setSpeaking(false)
      after()
    })
  }, [])

  const setVoiceOnBoth = useCallback((on: boolean): void => {
    voiceOnRef.current = on
    setVoiceOn(on)
    if (on) {
      spokenRef.current = ''
      roundsRef.current = 0
    } else {
      roundsRef.current = 0
      const rec = recRef.current
      recRef.current = null
      if (rec !== null) {
        rec.onresult = null
        rec.onerror = null
        rec.onend = null
        try {
          rec.abort()
        } catch {
          // Teardown races a natural end; handlers above are already detached.
        }
      }
      stopSpeaking()
      setListening(false)
      setSpeaking(false)
    }
  }, [])

  const handleSilence = useCallback((): void => {
    if (!voiceOnRef.current) return
    roundsRef.current += 1
    const { t } = liveRef.current
    if (roundsRef.current < MAX_SILENCE_ROUNDS) {
      speakDigest(t('nudge'), () => {
        startListening()
      })
    } else {
      speakDigest(t('standby'), () => {
        setVoiceOnBoth(false)
      })
    }
  }, [speakDigest, setVoiceOnBoth])

  const startListening = useCallback((): void => {
    if (!voiceOnRef.current) return
    const Ctor = recognitionConstructor()
    if (Ctor === undefined) return
    stopRecognition()
    stopRef.current = false
    setListening(true)
    const rec = new Ctor()
    rec.lang = 'pt-BR'
    rec.continuous = false
    rec.interimResults = false
    rec.maxAlternatives = 1
    recRef.current = rec
    rec.onresult = (event) => {
      const parts: string[] = []
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        if (result?.isFinal === true) parts.push(result[0]?.transcript ?? '')
      }
      const transcript = parts.join(' ').trim()
      recRef.current = null
      setListening(false)
      if (transcript === '') {
        handleSilence()
        return
      }
      roundsRef.current = 0
      liveRef.current.sendText(transcript)
    }
    rec.onerror = (event) => {
      recRef.current = null
      setListening(false)
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed' || event.error === 'audio-capture') {
        speakDigest(liveRef.current.t('denied'), () => {
          setVoiceOnBoth(false)
        })
        return
      }
      handleSilence()
    }
    rec.onend = () => {
      if (stopRef.current) {
        stopRef.current = false
        return
      }
      recRef.current = null
      setListening(false)
      handleSilence()
    }
    try {
      rec.start()
    } catch {
      recRef.current = null
      setListening(false)
      handleSilence()
    }
  }, [stopRecognition, speakDigest, handleSilence])

  // Turn edges drive the loop: mic off while the turn runs; on turn end,
  // speak the fresh digest (or open the mic when there is nothing to say).
  useEffect(() => {
    const was = prevRunningRef.current
    prevRunningRef.current = running
    if (running) {
      stopRecognition()
      return
    }
    if (!was) return
    if (!voiceOnRef.current) return
    const fala = extractFalaLine(lastText)
    if (fala === undefined || fala === spokenRef.current) {
      startListening()
      return
    }
    spokenRef.current = fala
    speakDigest(fala, () => {
      startListening()
    })
  }, [running, lastText, voiceOn, stopRecognition, speakDigest, startListening])

  // Session switch unmounts the row: never leak speech or an open mic.
  useEffect(() => () => {
    const rec = recRef.current
    recRef.current = null
    if (rec !== null) {
      rec.onresult = null
      rec.onerror = null
      rec.onend = null
      try {
        rec.abort()
      } catch {
        // Teardown races a natural end; handlers above are already detached.
      }
    }
    stopSpeaking()
  }, [])

  if (!voiceSupported()) {
    return (
      <button type="button" className={styles.voice} disabled title={t('noMic')} aria-label={t('noMic')}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="6" y="1" width="4" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M3 7a5 5 0 0 0 10 0M8 12v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    )
  }

  const toggle = (): void => {
    if (voiceOnRef.current) {
      setVoiceOnBoth(false)
      return
    }
    setVoiceOnBoth(true)
    startListening()
  }

  const className = [styles.voice, voiceOn ? styles.on : '', listening ? styles.live : '', speaking ? styles.busy : '']
    .filter(part => part !== '')
    .join(' ')
  return (
    <button
      type="button"
      className={className}
      onClick={toggle}
      aria-pressed={voiceOn}
      title={t('voice')}
      aria-label={t('voice')}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="6" y="1" width="4" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 7a5 5 0 0 0 10 0M8 12v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </button>
  )
}
