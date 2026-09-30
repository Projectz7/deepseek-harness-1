/**
 * Sidebar info bar: compact strip showing connection status, session preset,
 * and working directory. Registered in the sidebar footer action area.
 */
import { StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import css from './InfoBar.module.css'

export type InfoBarProps =
  { wide: boolean; useSessions: any }
  & PropsLocale<'sidebar-info'>

interface SessionRow {
  id: string
  title?: string
  displayTitle: string
  cwd?: string
  agentPreset?: string
  running: boolean
}

export function InfoBar({ wide, useSessions, t }: InfoBarProps) {
  if (!wide) return null
  const data = (useSessions as () => {
    sessions: Map<string, SessionRow>
    activeSessionId: string | undefined
  })()
  const { sessions, activeSessionId } = data
  const session = activeSessionId !== undefined ? sessions.get(activeSessionId) : undefined
  const connected = session !== undefined
  const shortDir = session?.cwd !== undefined
    ? session.cwd.split(/[\\/]/).pop() ?? session.cwd
    : undefined

  return (
    <div className={css.info}>
      <div className={css.row}>
        <StateDot state={connected ? 'done' : 'ongoing'} />
        <span className={css.label}>{t('status')}</span>
        <span className={css.value}>{connected ? t('online') : t('offline')}</span>
      </div>
      {session !== undefined && (
        <>
          <div className={css.row}>
            <span className={css.label}>{t('conversa')}</span>
            <span className={css.value}>{session.agentPreset ?? session.displayTitle}</span>
          </div>
          <div className={css.row}>
            <span className={css.label}>{t('cwd')}</span>
            <span className={css.value}>{shortDir ?? '—'}</span>
          </div>
        </>
      )}
    </div>
  )
}
