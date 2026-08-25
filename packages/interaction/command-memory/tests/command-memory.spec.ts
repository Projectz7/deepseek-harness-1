import type { Context } from '@deepseek-ai/cordis'
import type { CommandResult } from '@deepseek-ai/dsh-commands'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply, runMemory } from '../src/index.ts'

describe('runMemory', () => {
  let dir: string
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'dsh-memory-'))
  })
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('reports empty memory when no file exists', () => {
    const r = runMemory('', dir)
    expect(r.kind).toBe('success')
    if (r.kind === 'success') expect(r.text).toBe('Memory is empty.')
  })

  it('reports empty when the file exists but is blank', () => {
    writeFileSync(join(dir, 'MEMORY.md'), '')
    const r = runMemory('show', dir)
    expect(r.kind).toBe('success')
    if (r.kind === 'success') expect(r.text).toBe('Memory is empty.')
  })

  it('treats "show" as a read of existing content', () => {
    writeFileSync(join(dir, 'MEMORY.md'), 'line1\n')
    const r = runMemory('show', dir)
    expect(r.kind).toBe('success')
    if (r.kind === 'success') expect(r.text).toBe('line1\n')
  })

  it('appends a line when input is given', () => {
    const r = runMemory('remember this', dir)
    expect(r.kind).toBe('success')
    expect(readFileSync(join(dir, 'MEMORY.md'), 'utf8')).toBe('remember this\n')
  })

  it('prefixes a newline when appending to existing content', () => {
    writeFileSync(join(dir, 'MEMORY.md'), 'first\n')
    runMemory('second', dir)
    expect(readFileSync(join(dir, 'MEMORY.md'), 'utf8')).toBe('first\nsecond\n')
  })

  it('clears the memory file', () => {
    writeFileSync(join(dir, 'MEMORY.md'), 'first\n')
    const r = runMemory('clear', dir)
    expect(r.kind).toBe('success')
    expect(readFileSync(join(dir, 'MEMORY.md'), 'utf8')).toBe('')
  })

  it('errors when no workspace directory is available', () => {
    const r = runMemory('x', undefined)
    expect(r.kind).toBe('error')
  })
})

describe('apply', () => {
  it('registers a /memory command that delegates to runMemory', () => {
    const registrations: Array<{ name: string; handler: (i: CommandInvocationLike) => CommandResult }> = []
    apply({ commands: { register: (d: (typeof registrations)[number]) => registrations.push(d) } } as unknown as Context)
    expect(registrations).toHaveLength(1)
    expect(registrations[0]!.name).toBe('memory')
    const dir = mkdtempSync(join(tmpdir(), 'dsh-memory-'))
    const result = registrations[0]!.handler({ rawInput: 'hi', agent: { session: { header: { cwd: dir } } } } as unknown as CommandInvocationLike)
    expect(result.kind).toBe('success')
    expect(readFileSync(join(dir, 'MEMORY.md'), 'utf8')).toBe('hi\n')
    rmSync(dir, { recursive: true, force: true })
  })
})

interface CommandInvocationLike {
  rawInput: string
  agent: { session: { header: { cwd: string } } }
}
