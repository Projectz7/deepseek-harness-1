export const NS = 'sidebar-tasks'

export const en = {
  'title': 'Heavy Work',
  'empty': 'No background tasks. Dispatch heavy work via the conversation and it appears here.',
  'status.running': 'running',
  'status.stopping': 'stopping',
  'status.completed': 'completed',
  'status.killed': 'killed',
  'status.failed': 'failed',
} as const

export type TaskKey = keyof typeof en

export const zh: Record<TaskKey, string> = {
  'title': 'Heavy Work',
  'empty': 'No background tasks. Dispatch heavy work via the conversation and it appears here.',
  'status.running': 'running',
  'status.stopping': 'stopping',
  'status.completed': 'completed',
  'status.killed': 'killed',
  'status.failed': 'failed',
}
