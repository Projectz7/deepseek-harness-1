/**
 * Screen capture service: holds the shared tab/window handle selected via picker.
 * @module @deepseek-ai/dsh-screen-capture
 */
import { Service, type Context } from '@deepseek-ai/cordis'

export interface ScreenHandle {
  id: string
  label: string
  kind: 'tab' | 'window' | 'screen'
}

export class ScreenCaptureService extends Service {
  private handle: ScreenHandle | null = null

  constructor(ctx: Context) {
    super(ctx, 'screenCapture')
  }

  setHandle(handle: ScreenHandle | null): void {
    this.handle = handle
  }

  getHandle(): ScreenHandle | null {
    return this.handle
  }
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    screenCapture: ScreenCaptureService
  }
}

export const name = 'screen-capture'
export function apply(ctx: Context): void {
  ctx.provide('screenCapture', new ScreenCaptureService(ctx))
}