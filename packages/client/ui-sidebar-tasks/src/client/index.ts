/**
 * Sidebar background-tasks plugin: registers the heavy-work panel into the
 * `sidebar.background` slot. Data arrives entirely through the `jobsBySession`
 * list mirror — no RPC, no state of its own.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { BackgroundTasks } from './BackgroundTasks.tsx'
import { en, zh, NS, type TaskKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'sidebar-tasks': TaskKey
  }
}

export type { BackgroundTasks } from './BackgroundTasks.tsx'

/** Required services for locale registration and sidebar contribution. */
export const inject = ['sessions', 'slots', 'locale']

/** Registers the dictionaries and the sidebar background panel. */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-sidebar-tasks: dictionaries')
  ctx.slots.inject('sidebar.background', () => ctx.slots.register({
    name: 'sidebar.background',
    locale: NS,
  }, BackgroundTasks))
}
