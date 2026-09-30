/**
 * Sidebar info-bar plugin: registers a compact info strip in the footer
 * action area showing connection status and session info.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import { InfoBar } from './InfoBar.tsx'
import { en, zh, NS, type SidebarInfoKey } from './locales.ts'

// Declaration merging: the 'sidebar.footer.action' slot is declared by
// ui-sidebar's contract. Declaring it here too avoids importing the whole
// ui-sidebar dependency chain (ui-layout -> ui-theme -> ...) into this
// package's compilation unit while still giving the slot system the type.
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    'sidebar.footer.action': {
      kind: 'list'
      scope: 'root'
      owner: { wide: boolean }
    }
  }
  interface LocaleNamespaceMap {
    'sidebar-info': SidebarInfoKey
  }
}

export type { InfoBar } from './InfoBar.tsx'
export type { SidebarInfoKey } from './locales.ts'

export const inject = ['slots', 'sessions', 'locale']

export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-sidebar-info: dictionaries')
  ctx.slots.inject(
    'sidebar.footer.action',
    () => ctx.slots.register({
      name: 'sidebar.footer.action',
      id: 'sidebar-info',
      order: 10,
      locale: NS,
    }, InfoBar),
  )
}
