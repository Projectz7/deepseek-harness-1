/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-client-ui-screen-picker`.
 * @module @deepseek-ai/dsh-client-ui-screen-picker/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-client-ui-screen-picker'

/** Cordis companion plugin name. */
export const name = 'client-ui-screen-picker-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: the package is a pure UI picker component with no
 * stateful contracts; the slot registry owns its lifecycle.
 */
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
