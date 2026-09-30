/**
 * Sidebar info bar: compact strip showing active model, connection status,
 * and working directory. Registered in the sidebar footer action area.
 */
import { StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import css from './InfoBar.module.css'

export type InfoBarProps =
  { wide: boolean; useSessions: any }
  & PropsLocale<'sidebar-info'>

export function InfoBar({ wide, useSessions, t }: InfoBarProps) {
  if (!wide) return null
  const data = (useSessions as () => { activeSessionId: string | undefined })()
  const connected = data.activeSessionId !== undefined

  return (
    <div className={css.info}>
      <div className={css.row}>
        <StateDot state={connected ? 'done' : 'ongoing'} />
        <span className={css.label}>{t('status')}</span>
        <span className={css.value}>{connected ? t('online') : t('offline')}</span>
      </div>
      <div className={css.row}>
        <span className={css.label}>{t('conversa')}</span>
        <span className={css.value}>{data.activeSessionId ?? '—'}</span>
      </div>
    </div>
  )
}
