/**
 * Runtime and tool surface: evidence, export, failure branches.
 * @module test/runtime-tools.spec
 */

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { validateRep } from '@perrylink/dsh-research-core'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { analyzeIrb } from '../src/analyze.ts'
import { resolveConfig } from '../src/config.ts'
import { IrbRuntime } from '../src/runtime.ts'
import { makeIrbCheckTool } from '../src/tools/irb-check.ts'
import { makeIrbExportTool } from '../src/tools/irb-export.ts'
import { makeIrbRiskTool } from '../src/tools/irb-risk.ts'
import { VERSION } from '../src/version.ts'

const AT = new Date('2026-11-05T09:00:00.000Z')
const TEXT = '研究题目：测试\n研究目的：目的。\n知情同意：书面同意。\n保密：加密存储。\n风险：轻微。\n'
let workspace: string
let store: string

beforeEach(async () => {
  workspace = await mkdtemp(path.join(tmpdir(), 'irb-work-'))
  store = await mkdtemp(path.join(tmpdir(), 'irb-store-'))
  await writeFile(path.join(workspace, 'application.md'), TEXT, 'utf8')
})

afterEach(async () => {
  for (const directory of [workspace, store]) {
    if (directory.startsWith(tmpdir())) await rm(directory, { recursive: true, force: true })
  }
})

/** Build a runtime over the fixtures. */
function runtime(): IrbRuntime {
  return new IrbRuntime({ config: resolveConfig({ workspaceRoot: workspace, root: store }), now: () => AT })
}

const EXEC = {} as never

describe('runtime', () => {
  it('checks a file and writes a valid REP record', async () => {
    const result = await runtime().check({ path: 'application.md' })
    expect(result.analysis.findings.find(finding => finding.id === 'consent')?.status).toBe('present')
    expect(result.evidenceId).toMatch(/^ev-/u)
    const record = JSON.parse(await readFile(result.recordPath!, 'utf8')) as {
      evidence: Array<{ checks: Array<{ detail: string; status: string; code?: string }> }>
    }
    expect(validateRep(record).ok).toBe(true)
    const optionalMissing = record.evidence[0]!.checks.find(check => check.detail.startsWith('Assent for minors'))
    expect(optionalMissing?.status).toBe('skipped')
    expect(optionalMissing?.code).toBe('not_applicable')
  })

  it('rejects traversal, binary files, oversized text and empty input', async () => {
    await expect(runtime().check({ path: '../escape.md' })).rejects.toMatchObject({ code: 'PATH_ESCAPE' })
    await expect(runtime().check({ path: path.resolve(workspace, '..', 'outside.md') })).rejects.toMatchObject({ code: 'PATH_ESCAPE' })
    await writeFile(path.join(workspace, 'application.pdf'), 'pdf', 'utf8')
    await expect(runtime().check({ path: 'application.pdf' })).rejects.toMatchObject({ code: 'UNSUPPORTED_FILE' })
    const tiny = new IrbRuntime({ config: resolveConfig({ workspaceRoot: workspace, root: store, maxChars: 10 }), now: () => AT })
    await expect(tiny.check({ text: TEXT })).rejects.toMatchObject({ code: 'TOO_LARGE' })
    await expect(runtime().check({ text: '   ' })).rejects.toMatchObject({ code: 'INVALID_INPUT' })
  })
})

describe('tools', () => {
  it('declares names and schemas', () => {
    for (const [tool, name] of [
      [makeIrbCheckTool(runtime()), 'irb_check'],
      [makeIrbRiskTool(runtime()), 'irb_risk'],
      [makeIrbExportTool(runtime()), 'irb_export'],
    ] as const) {
      expect(tool.name).toBe(name)
      expect(tool.output.schema).toBeDefined()
    }
  })

  it('check → risk → export end to end', async () => {
    const checked = (await makeIrbCheckTool(runtime()).execute({ text: TEXT }, EXEC)) as { ok: true; analysis: unknown }
    expect(checked.ok).toBe(true)
    const risk = (await makeIrbRiskTool(runtime()).execute({ minors: true }, EXEC)) as { ok: true; risk: { level: string; safeguards: string[] } }
    expect(risk.risk.level).toBe('greater_than_minimal')
    const exported = (await makeIrbExportTool(runtime()).execute({ analysis: checked.analysis, risk: risk.risk }, EXEC)) as {
      ok: true
      markdown: string
      sarif: { version: string; runs: Array<{ results: unknown[] }> }
    }
    expect(exported.markdown).toContain('Ethics application checklist')
    expect(exported.markdown).toContain('Risk (advisory)')
    expect(exported.sarif.version).toBe('2.1.0')
    expect(exported.sarif.runs[0]!.results.length).toBeGreaterThan(0)
  })

  it('failure branches carry stable codes', async () => {
    const value = (await makeIrbCheckTool(runtime()).execute({}, EXEC)) as { ok: false; error: { code: string } }
    expect(value.error.code).toBe('INVALID_INPUT')
    const noExport = (await makeIrbExportTool(runtime()).execute({ analysis: {} }, EXEC)) as { ok: false; error: { code: string } }
    expect(noExport.error.code).toBe('INVALID_INPUT')
  })

  it('rejects malformed analysis/risk objects instead of throwing in the renderer', async () => {
    const exportTool = makeIrbExportTool(runtime())
    const badAnalysis = (await exportTool.execute({ analysis: { findings: [null] } }, EXEC)) as { ok: false; error: { code: string } }
    expect(badAnalysis.error.code).toBe('INVALID_INPUT')
    const analysis = analyzeIrb(TEXT)
    const badRisk = (await exportTool.execute({ analysis, risk: { level: 'minimal' } }, EXEC)) as { ok: false; error: { code: string } }
    expect(badRisk.error.code).toBe('INVALID_INPUT')
    const goodRisk = { level: 'minimal' as const, factors: [], safeguards: [], advisory: 'advisory' }
    const good = (await exportTool.execute({ analysis, risk: goodRisk }, EXEC)) as { ok: true }
    expect(good.ok).toBe(true)
  })
})

describe('package', () => {
  it('VERSION matches package.json and the manifest declares a bundle patch', async () => {
    const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')) as Record<string, unknown>
    expect(pkg['version']).toBe(VERSION)
    expect(pkg['dsh']).toEqual({ manifestVersion: 1, bundle: { patch: './cordis.patch.yml' } })
    expect(pkg['dependencies']).toEqual({})
  })
})
