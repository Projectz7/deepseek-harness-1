/**
 * Auto-discovery for MCP servers from mcp.json in the workspace.
 * Watches for mcp.json in the session's cwd and auto-registers mcp-client instances.
 * @module @deepseek-ai/dsh-mcp-auto
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'

export const name = 'mcp-auto'
export const inject: string[] = []

export interface Config {
  /** File names to search for, in order. Defaults to mcp.json variants. */
  mcpFileNames?: string[]
  /** Whether to watch for file changes. */
  watch?: boolean
}

const DEFAULT_MCP_FILES = ['mcp.json', '.cursor/mcp.json', '.vscode/mcp.json', 'mcp.jsonc', '.cursor/mcp.jsonc'] as const

interface McpJson {
  mcpServers?: Record<string, {
    command?: string
    args?: string[]
    env?: Record<string, string>
    cwd?: string
    transport?: string
    url?: string
    headers?: Record<string, string>
  }>
}

export async function findMcpJson(cwd: string, fileNames: readonly string[]): Promise<{ path: string; content: McpJson } | undefined> {
  for (const fileName of fileNames) {
    const fullPath = join(cwd, fileName)
    try {
      const raw = await readFile(fullPath, 'utf8')
      // Handle jsonc (strip comments) - simple approach: try JSON, if fails try stripping // and /* */
      let jsonText = raw
      try {
        const parsed = JSON.parse(jsonText) as McpJson
        if (parsed.mcpServers && typeof parsed.mcpServers === 'object') {
          return { path: fullPath, content: parsed }
        }
      } catch {
        // Try stripping comments for jsonc
        jsonText = raw.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
        const parsed = JSON.parse(jsonText) as McpJson
        if (parsed.mcpServers && typeof parsed.mcpServers === 'object') {
          return { path: fullPath, content: parsed }
        }
      }
    } catch {
      // File not found or invalid, try next
      continue
    }
  }
  return undefined
}

export function apply(ctx: Context, config: Config = {}): void {
  const fileNames = config.mcpFileNames ?? DEFAULT_MCP_FILES
  const disposers = new Map<string, () => void>()
  const loadedServers = new Set<string>()

  async function loadForAgent(agent: Agent): Promise<void> {
    const cwd = agent.session.header.cwd
    if (!cwd) return
    const found = await findMcpJson(cwd, fileNames)
    if (!found) return

    for (const [serverName, serverConfig] of Object.entries(found.content.mcpServers ?? {})) {
      if (loadedServers.has(`${cwd}:${serverName}`)) continue
      // Validate serverName
      if (!/^[A-Za-z0-9_-]{1,32}$/.test(serverName)) {
        ctx.logger.warn(`mcp-auto: skipping invalid serverName "${serverName}" in ${found.path}`)
        continue
      }
      try {
        // Determine transport and build mcp-client config
        const mcpConfig: Record<string, unknown> = {
          serverName,
          toolCallTimeoutMs: 60_000,
          failOnStartupError: false,
        }
        if (serverConfig.url) {
          mcpConfig.transport = 'streamable-http'
          mcpConfig.url = serverConfig.url
          mcpConfig.headers = serverConfig.headers ?? {}
        } else if (serverConfig.command) {
          mcpConfig.transport = 'stdio'
          mcpConfig.command = serverConfig.command
          mcpConfig.args = serverConfig.args ?? []
          mcpConfig.env = serverConfig.env ?? {}
          mcpConfig.cwd = serverConfig.cwd ?? cwd
        } else {
          ctx.logger.warn(`mcp-auto: server "${serverName}" in ${found.path} has no command or url, skipping`)
          continue
        }
        // Dynamically load mcp-client plugin
        const dispose = await (ctx as unknown as { plugin: (mod: unknown, cfg: unknown) => Promise<() => void> }).plugin(
          await import('@deepseek-ai/dsh-mcp-client'),
          mcpConfig,
        )
        const key = `${cwd}:${serverName}`
        loadedServers.add(key)
        disposers.set(key, dispose)
        ctx.logger.info(`mcp-auto: registered MCP server "${serverName}" from ${found.path}`)
      } catch (error) {
        ctx.logger.warn(`mcp-auto: failed to register server "${serverName}" from ${found.path}: ${String(error)}`)
      }
    }
  }

  ctx.on('agent/session-start', ({ agent }) => {
    void loadForAgent(agent).catch((error) => {
      ctx.logger.warn(`mcp-auto: failed to load for session ${agent.session.header.id}: ${String(error)}`)
    })
  })

  ctx.effect(() => {
    return () => {
      for (const dispose of disposers.values()) {
        try { dispose() } catch {}
      }
      disposers.clear()
      loadedServers.clear()
    }
  }, 'mcp-auto: cleanup')
}
