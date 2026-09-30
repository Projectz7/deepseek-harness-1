import { BackgroundTasks } from './BackgroundTasks.tsx';
import { en, zh, NS } from './locales.ts';
/** Required services for locale registration and sidebar contribution. */
export const inject = ['sessions', 'slots', 'locale'];
/** Registers the dictionaries and the sidebar background panel. */
export function apply(ctx) {
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-sidebar-tasks: dictionaries');
    ctx.slots.inject('sidebar.background', () => ctx.slots.register({
        name: 'sidebar.background',
        id: 'sidebar-tasks',
        order: 30,
        locale: NS,
    }, BackgroundTasks));
}
