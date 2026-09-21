/**
 * Browser speech primitives for the voice loop: speech recognition (mic),
 * speech synthesis (voice replies), and the `Fala:` digest protocol.
 *
 * SpeechRecognition has no stable unprefixed DOM typing, so this module
 * declares the minimal structural surface it uses and feature-detects the
 * constructor at runtime (Chrome/Edge). SpeechSynthesis is standard DOM.
 * @module voice/speech
 */

/** One recognized alternative. */
export interface VoiceAlternative {
  readonly transcript: string
  readonly confidence: number
}

/** One recognition result (final or interim). */
export interface VoiceResult {
  readonly isFinal: boolean
  readonly length: number
  readonly [index: number]: VoiceAlternative
}

/** Recognition result list. */
export interface VoiceResultList {
  readonly length: number
  readonly [index: number]: VoiceResult
}

/** Minimal recognition event surface used by the loop. */
export interface VoiceRecognitionEvent {
  readonly results: VoiceResultList
}

/** Minimal recognition error surface used by the loop. */
export interface VoiceRecognitionError {
  readonly error: string
}

/** Minimal SpeechRecognition surface used by the loop. */
export interface VoiceRecognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: VoiceRecognitionEvent) => void) | null
  onerror: ((event: VoiceRecognitionError) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

/** Recognition constructor shape. */
export interface VoiceRecognitionConstructor {
  new (): VoiceRecognition
}

/**
 * Feature-detect the recognition constructor (standard or webkit-prefixed).
 * @returns the constructor, or undefined where the browser has no mic API.
 */
export function recognitionConstructor(): VoiceRecognitionConstructor | undefined {
  const scope = window as unknown as {
    SpeechRecognition?: VoiceRecognitionConstructor
    webkitSpeechRecognition?: VoiceRecognitionConstructor
  }
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition
}

/**
 * Whether this browser can do both halves of the voice loop.
 */
export function voiceSupported(): boolean {
  return recognitionConstructor() !== undefined
    && typeof window.speechSynthesis !== 'undefined'
}

/** Best Portuguese TTS voice, falling back to whatever speaks. */
function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices()
  return voices.find(voice => voice.lang.toLowerCase() === 'pt-br')
    ?? voices.find(voice => voice.lang.toLowerCase().startsWith('pt'))
    ?? voices[0]
}

/**
 * Speak one digest line. Cancels any in-flight speech first so turns never
 * overlap. Short by protocol (the `Fala:` line), so the Chrome long-speech
 * pause does not bite.
 * @param text - the digest to speak (already outcome-only, never reasoning).
 * @param onend - called when speaking finishes naturally.
 */
export function speak(text: string, onend: () => void): void {
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'pt-BR'
  utterance.rate = 1
  const voice = pickVoice()
  if (voice !== undefined) utterance.voice = voice
  utterance.onend = onend
  window.speechSynthesis.speak(utterance)
}

/** Stop any in-flight speech immediately. */
export function stopSpeaking(): void {
  window.speechSynthesis.cancel()
}

/** Maximum spoken digest length; the protocol keeps digests far shorter. */
const MAX_SPOKEN_CHARS = 400

/**
 * Extract the spoken digest: the LAST `Fala:` line of an assistant message.
 * The persona guarantees one line with at most two sentences (what was
 * accomplished + one follow-up question) — never step-by-step, never
 * reasoning. Returns undefined when the message carries no digest, in which
 * case the loop stays silent and listens instead of reading prose aloud.
 * @param text - full assistant message text.
 */
export function extractFalaLine(text: string): string | undefined {
  const matches = [...text.matchAll(/^Fala:\s*(.+?)\s*$/gim)]
  const last = matches[matches.length - 1]?.[1] ?? ''
  const spoken = last.trim().slice(0, MAX_SPOKEN_CHARS)
  return spoken === '' ? undefined : spoken
}

/** Assistant text-block shape (structural subset of the runtime node type). */
interface TextBlock {
  readonly kind: string
  readonly text?: unknown
}

/** Assistant node shape (structural subset of the runtime node type). */
interface AssistantNode {
  readonly kind: string
  readonly blocks?: readonly TextBlock[]
}

/**
 * Plain text of the most recent assistant message in a snapshot node list.
 * @param nodes - snapshot nodes, oldest first.
 */
export function lastAssistantText(nodes: ReadonlyArray<{ readonly kind: string }>): string {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i] as AssistantNode | undefined
    if (node?.kind !== 'assistant') continue
    const blocks = node.blocks ?? []
    return blocks
      .filter((block): block is TextBlock & { text: string } => block.kind === 'text' && typeof block.text === 'string')
      .map(block => block.text)
      .join('')
  }
  return ''
}
