/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-auto-approve`.
 * @module @deepseek-ai/dsh-auto-approve/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-auto-approve'

/** Cordis companion plugin name. */
export const name = 'auto-approve-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: this plugin bridges approval/request to an unconditional
 * allow, with no event stream or persisted projection to guard; behavior is
 * covered by unit tests and the approval audit log.
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