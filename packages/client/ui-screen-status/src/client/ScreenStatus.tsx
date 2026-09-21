import { clsx } from 'clsx'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { ScreenHandle } from '@deepseek-ai/dsh-screen-capture'
import styles from './ScreenStatus.module.css'

export interface ScreenStatusProps {
  /** Current screen handle from the screen-capture service */
  handle: ScreenHandle | null
}

export function ScreenStatus({ handle, t }: ScreenStatusProps & PropsLocale<'screen'>) {
  const kindLabels: Record<string, string> = {
    tab: t('kind.tab'),
    window: t('kind.window'),
    screen: t('kind.screen'),
  }

  if (!handle) {
    return (
      <div className={styles.container}>
        <span className={clsx(styles.badge, styles.empty)}>{t('none')}</span>
        <span className={styles.hint}>{t('hint')}</span>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <span className={clsx(styles.badge, styles.active)}>{t('capturing')}</span>
      <div className={styles.info}>
        <span className={styles.kind}>{kindLabels[handle.kind] ?? handle.kind}</span>
        <span className={styles.label}>{handle.label}</span>
      </div>
    </div>
  )
}
