import { useCallback, useState } from 'react'
import { clsx } from 'clsx'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { BrowserTabHandle } from '@deepseek-ai/dsh-browser'
import styles from './BrowserTab.module.css'

export interface BrowserTabProps {
  /** Current attached tab handle from the browser service */
  tab: BrowserTabHandle | null
  /** Current CDP URL */
  cdpUrl: string | null
  /** Callback to attach via CDP */
  onAttach: (cdpUrl: string) => Promise<BrowserTabHandle>
  /** Callback to detach */
  onDetach: () => void
}

export function BrowserTab({ tab, cdpUrl, onAttach, onDetach, t }: BrowserTabProps & PropsLocale<'browser'>) {
  const [inputUrl, setInputUrl] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAttach = useCallback(async () => {
    if (!inputUrl.trim()) return
    setConnecting(true)
    setError(null)
    try {
      await onAttach(inputUrl.trim())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setConnecting(false)
    }
  }, [inputUrl, onAttach])

  const handleDetach = useCallback(() => {
    onDetach()
  }, [onDetach])

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Site Explorer (Browser CDP)</h3>

      {tab ? (
        <div className={styles.attached}>
          <div className={styles.tabInfo}>
            <span className={styles.label}>{t('tab')}:</span>
            <div>
              <strong>{tab.title}</strong>
              <div className={styles.url}>{tab.url}</div>
            </div>
          </div>
          <button className={clsx(styles.button, styles.detach)} onClick={handleDetach}>
            {t('detach')}
          </button>
        </div>
      ) : (
        <div className={styles.disconnected}>
          <p className={styles.hint}>{t('hint')}</p>
          <div className={styles.inputGroup}>
            <input
              type="text"
              value={inputUrl}
              onChange={e => setInputUrl(e.target.value)}
              placeholder="http://localhost:9222"
              className={styles.input}
              disabled={connecting}
            />
            <button className={clsx(styles.button, styles.connect)} onClick={handleAttach} disabled={connecting || !inputUrl.trim()}>
              {connecting ? t('connecting') : t('connect')}
            </button>
          </div>
        </div>
      )}

      {error !== null && <div className={styles.error} role="alert">{error}</div>}

      {cdpUrl && !tab && (
        <p className={styles.connecting}>Conectando ao CDP: {cdpUrl}...</p>
      )}
    </div>
  )
}
