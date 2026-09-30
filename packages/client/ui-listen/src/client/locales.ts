export const NS = 'listen'

export const en = {
  'listen': 'Listen',
  'stop': 'Stop',
  'unsupported': 'Speech synthesis not supported in this browser',
} as const

export type ListenKey = keyof typeof en

export const zh: Record<ListenKey, string> = {
  'listen': 'Listen',
  'stop': 'Stop',
  'unsupported': 'Speech synthesis not supported in this browser',
}
