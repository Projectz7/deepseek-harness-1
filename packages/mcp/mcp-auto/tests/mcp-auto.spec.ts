import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { findMcpJson, name } from '../src/index.ts'

describe('mcp-auto', () => {
  let dir: string
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'dsh-mcp-auto-')) })
  afterEach(() => { rmSync(dir, { recursive: true, force: true }) })

  it('exposes correct plugin name', () => {
    expect(name).toBe('mcp-auto')
  })

  it('returns undefined when no mcp.json exists', async () => {
    const r = await findMcpJson(dir, ['mcp.json'])
    expect(r).toBeUndefined()
  })

  it('finds mcp.json in cwd', async () => {
    writeFileSync(join(dir, 'mcp.json'), JSON.stringify({ mcpServers: { foo: { command: 'node', args: [] } } }))
    const r = await findMcpJson(dir, ['mcp.json'])
    expect(r?.content.mcpServers?.foo?.command).toBe('node')
  })

  it('prefers first fileName that exists', async () => {
    mkdirSync(join(dir, '.cursor'), { recursive: true })
    writeFileSync(join(dir, 'mcp.json'), JSON.stringify({ mcpServers: { a: { command: 'x' } } }))
    writeFileSync(join(dir, '.cursor/mcp.json'), JSON.stringify({ mcpServers: { b: { command: 'y' } } }))
    const r = await findMcpJson(dir, ['mcp.json', '.cursor/mcp.json'])
    expect(r?.content.mcpServers?.a).toBeDefined()
  })

  it('handles jsonc with comments', async () => {
    writeFileSync(join(dir, 'mcp.json'), `{
      // comment
      "mcpServers": { "s": { "command": "node" } }
    }`)
    const r = await findMcpJson(dir, ['mcp.json'])
    expect(r?.content.mcpServers?.s?.command).toBe('node')
  })

  it('skips file without mcpServers', async () => {
    writeFileSync(join(dir, 'mcp.json'), JSON.stringify({ not: 1 }))
    const r = await findMcpJson(dir, ['mcp.json', '.cursor/mcp.json'])
    expect(r).toBeUndefined()
  })
})
