export const NS = 'sidebar-info'

export const en = {
  'models': 'Models',
  'conversa': 'Chat',
  'trabalho': 'Work',
  'status': 'Status',
  'online': 'online',
  'offline': 'offline',
  'cwd': 'Directory',
} as const

export type SidebarInfoKey = keyof typeof en

export const zh: Record<SidebarInfoKey, string> = en
