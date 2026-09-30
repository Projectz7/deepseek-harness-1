/**
 * Sidebar background-tasks panel: heavy-work (subagent) tasks with live status.
 * Data arrives through the `jobsBySession` list mirror.
 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { JobView } from '@deepseek-ai/dsh-client-runtime/client'
import { StateDot, type StateDotState } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { SidebarBackgroundOwnerProps } from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type { TaskKey } from './locales.ts'
import css from './BackgroundTasks.module.css'

/** Full component props: sidebar owner state + runtime session hooks + locale. */
/* eslint-disable @typescript-eslint/no-explicit-any */
export type BackgroundTasksProps =
  SidebarBackgroundOwnerProps
  & { useSessions: (...args: any[]) => any }
  & PropsLocale<'sidebar-tasks'>

function dotState(status: JobView['status']): StateDotState {
  switch (status) {
    case 'running': return 'ongoing'
    case 'stopping': return 'warning'
    case 'completed': return 'done'
    case 'killed': return 'warning'
    case 'failed': return 'error'
    default: return 'ongoing'
  }
}

function statusLabel(status: JobView['status'], t: (k: TaskKey) => string): string {
  switch (status) {
    case 'running': return t('status.running')
    case 'stopping': return t('status.stopping')
    case 'completed': return t('status.completed')
    case 'killed': return t('status.killed')
    case 'failed': return t('status.failed')
    default: return status
  }
}

function elapsed(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  return `${Math.round(seconds / 3600)}h`
}

export function BackgroundTasks({
  wide,
  expandSidebar,
  useSessions,
  t,
}: BackgroundTasksProps) {
  const { jobsBySession, sessionId } = useSessions()
  const jobs = useMemo(() => {
    if (sessionId === undefined) return []
    const list = jobsBySession.get(sessionId)
    return list === undefined ? [] : [...list.values()].sort(
      (a, b) => (a.status === 'running' ? -1 : 1) - (b.status === 'running' ? -1 : 1),
    )
  }, [jobsBySession, sessionId])

  const running = jobs.filter((j) => j.status === 'running').length

  const [open, setOpen] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent): void => {
      const target = e.target as HTMLElement
      if (panel.current !== null && !panel.current.contains(target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  if (!wide) {
    return (
      <button
        type="button"
        className={css.railButton}
        aria-label={t('title')}
        onClick={() => { expandSidebar() }}
      >
        <StateDot state={running > 0 ? 'ongoing' : 'done'} />
        {running > 0 && <span className={css.railBadge}>{running}</span>}
      </button>
    )
  }

  return (
    <div className={css.section} ref={panel}>
      <button
        type="button"
        className={css.header}
        onClick={() => { setOpen((v) => !v) }}
        onKeyDown={(e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((v) => !v) }
        }}
      >
        <span className={css.headerLabel}>{t('title')}</span>
        {running > 0 && <span className={css.runningBadge}>{running}</span>}
        {jobs.length > 0 && !open && <span className={css.countBadge}>{jobs.length}</span>}
      </button>

      {open && jobs.length > 0 && (
        <div className={css.list}>
          {jobs.map((job) => (
            <div key={job.id} className={css.row}>
              <StateDot state={dotState(job.status)} />
              <div className={css.rowContent}>
                <span className={css.rowLabel}>{job.label}</span>
                <span className={css.rowMeta}>
                  {statusLabel(job.status, t)}
                  {job.startedAt !== undefined && (
                    <> · {elapsed(Math.max(0, (job.finishedAt ?? Date.now()) - job.startedAt) / 1000)}</>
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && jobs.length === 0 && (
        <div className={css.empty}>{t('empty')}</div>
      )}
    </div>
  )
}
