/**
 * Package-owned invariant companion for `@deepseek-ai/dsh-mcp-auto`.
 * @module @deepseek-ai/dsh-mcp-auto/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-mcp-auto'

/** Cordis companion plugin name. */
export const name = 'mcp-auto-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: this plugin bridges mcp.json discovery to mcp-client registration; accepted
 * mutations are plugin disposers tracked in-memory and cwd-scoped deduplication, with no persisted
 * projection or event stream to guard.
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
