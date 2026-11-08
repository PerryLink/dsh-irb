/**
 * Runtime: workspace-safe text loading, checklist with REP evidence, risk, export.
 * @module dsh-irb/runtime
 */

import { mkdir, readFile, realpath, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  EvidenceStore,
  RepStoreError,
  stableId,
  validateRep,
  type AddEvidenceInput,
  type CaptureInput,
  type CheckResult,
  type Evidence,
  type ResearchRecord,
  type Snapshot,
} from '@perrylink/dsh-research-core'
import type { ResolvedConfig } from './config.ts'
import { analyzeIrb, type IrbAnalysis } from './analyze.ts'
import { assessRisk, type RiskAnswers, type RiskResult } from './checklist.ts'
import { renderIrbMarkdown, renderIrbSarif } from './report.ts'
import { VERSION } from './version.ts'

/** Stable error codes. */
export type IrbErrorCode = 'INVALID_INPUT' | 'NOT_FOUND' | 'PATH_ESCAPE' | 'NOT_A_FILE' | 'TOO_LARGE' | 'UNSUPPORTED_FILE' | 'STORE_ERROR'

/** A typed failure. */
export class IrbError extends Error {
  /** Stable code. */
  readonly code: IrbErrorCode

  constructor(code: IrbErrorCode, message: string) {
    super(message)
    this.name = 'IrbError'
    this.code = code
  }
}

/** The subset of the REP service used here. */
export interface EvidencePort {
  capture(input: CaptureInput): Promise<{ snapshot: Snapshot }>
  addEvidence(input: AddEvidenceInput): Promise<{ evidence: Evidence }>
  buildRecord(options?: { evidenceIds?: readonly string[] }): Promise<Omit<ResearchRecord, 'manifest'>>
}

/** Check value. */
export interface CheckValue {
  readonly analysis: IrbAnalysis
  readonly evidenceId?: string
  readonly recordPath?: string
}

/** Runtime options. */
export interface IrbRuntimeOptions {
  readonly config: ResolvedConfig
  readonly service?: EvidencePort
  readonly now?: () => Date
}

/** True when `candidate` is inside `root`. */
function isInside(root: string, candidate: string): boolean {
  return candidate === root || candidate.startsWith(root.endsWith(path.sep) ? root : `${root}${path.sep}`)
}

/** The runtime. */
export class IrbRuntime {
  readonly config: ResolvedConfig

  readonly #service: EvidencePort | undefined
  readonly #now: () => Date
  #store: EvidenceStore | undefined

  constructor(options: IrbRuntimeOptions) {
    this.config = options.config
    this.#service = options.service
    this.#now = options.now ?? (() => new Date())
  }

  /** Current ISO timestamp. */
  iso(): string {
    return this.#now().toISOString()
  }

  /** The evidence port. */
  port(): EvidencePort {
    if (this.#service !== undefined) return this.#service
    this.#store ??= new EvidenceStore(path.join(this.config.root, 'store'))
    return this.#store
  }

  /** Resolve a file inside the workspace. */
  async resolveFile(input: string): Promise<{ absolute: string; id: string }> {
    if (typeof input !== 'string' || input.trim() === '') throw new IrbError('INVALID_INPUT', 'path must be a non-empty string')
    let realRoot: string
    try {
      realRoot = await realpath(this.config.workspaceRoot)
    } catch {
      throw new IrbError('NOT_FOUND', `workspace root does not exist: ${this.config.workspaceRoot}`)
    }
    const candidate = path.resolve(realRoot, input)
    if (!isInside(realRoot, candidate)) throw new IrbError('PATH_ESCAPE', 'path resolves outside the workspace root')
    let real: string
    try {
      real = await realpath(candidate)
    } catch {
      throw new IrbError('NOT_FOUND', `file not found: ${input}`)
    }
    if (!isInside(realRoot, real)) throw new IrbError('PATH_ESCAPE', 'path escapes the workspace root through a symlink')
    if (!(await stat(real)).isFile()) throw new IrbError('NOT_A_FILE', `not a regular file: ${input}`)
    return { absolute: real, id: path.relative(realRoot, real).split(path.sep).join('/') }
  }

  /**
   * Check an ethics application.
   * @param request - text/path and persistence.
   * @returns the analysis and evidence ids.
   */
  async check(request: { text?: string; path?: string; persist?: boolean }): Promise<CheckValue> {
    if ((request.text === undefined) === (request.path === undefined)) throw new IrbError('INVALID_INPUT', 'pass exactly one of text or path')
    let text: string
    let sourceRef: AddEvidenceInput['sourceRef']
    let id: string
    if (request.text !== undefined) {
      if (request.text.length > this.config.maxChars) throw new IrbError('TOO_LARGE', `application is ${request.text.length} characters, the cap is ${this.config.maxChars}`)
      text = request.text
      sourceRef = { kind: 'other', id: 'inline:irb-application', retrievedAt: this.iso() }
      id = 'inline:irb-application'
    } else {
      const file = await this.resolveFile(request.path!)
      if (/\.(docx?|pdf)$/iu.test(file.id)) throw new IrbError('UNSUPPORTED_FILE', 'docx/pdf is not parsed here; convert to .md/.txt (PDF text: dsh-doc-anchor)')
      text = await readFile(file.absolute, 'utf8')
      if (text.length > this.config.maxChars) throw new IrbError('TOO_LARGE', `application is ${text.length} characters, the cap is ${this.config.maxChars}`)
      sourceRef = { kind: 'file', id: file.id, retrievedAt: this.iso() }
      id = file.id
    }
    let analysis: IrbAnalysis
    try {
      analysis = analyzeIrb(text)
    } catch (error) {
      if (error instanceof RangeError) throw new IrbError('INVALID_INPUT', error.message)
      throw error
    }
    const persist = request.persist ?? this.config.persist
    if (!persist) return { analysis }
    const checks: CheckResult[] = analysis.findings.map(finding => ({
      checkId: `chk-irb-${finding.id}`,
      check: 'other' as const,
      status: finding.status === 'present' ? ('pass' as const) : finding.severity === 'warning' ? ('warn' as const) : ('skipped' as const),
      ...(finding.status === 'present' || finding.severity === 'warning' ? {} : { code: 'not_applicable' as const }),
      severity: finding.severity === 'warning' ? ('warning' as const) : ('info' as const),
      detail: finding.status === 'present' ? `${finding.label} present` : `${finding.label} missing — ${finding.advice ?? ''}`,
      ...(finding.locator === undefined ? {} : { actual: { charStart: finding.locator.charStart, charEnd: finding.locator.charEnd } }),
    }))
    const port = this.port()
    try {
      const captured = await port.capture({ bytes: text, mediaType: 'text/plain', sourceRef, capturedAt: this.iso() })
      const evidence = (
        await port.addEvidence({
          evidenceId: stableId('ev', ['irb', id, captured.snapshot.snapshotId]),
          title: `Ethics application (${analysis.present}/${analysis.total} items)`,
          sourceRef,
          snapshotIds: [captured.snapshot.snapshotId],
          anchors: [{ snapshotId: captured.snapshot.snapshotId, kind: 'record', value: 'field:text' }],
          provenance: { plugin: 'dsh-irb', version: VERSION, method: 'keyword-checklist', retrievedAt: this.iso() },
          checks,
          notes: `core items missing: ${analysis.coreMissing.join(', ') || 'none'}; advisory only, not an IRB decision`,
        })
      ).evidence
      const record = await port.buildRecord({ evidenceIds: [evidence.evidenceId] })
      if (!validateRep(record).ok) throw new IrbError('STORE_ERROR', 'refusing to write an invalid REP record')
      const directory = path.join(this.config.root, 'records')
      await mkdir(directory, { recursive: true })
      const recordPath = path.join(directory, `${evidence.evidenceId}.rep.json`)
      await writeFile(recordPath, `${JSON.stringify(record, null, 2)}\n`, 'utf8')
      return { analysis, evidenceId: evidence.evidenceId, recordPath }
    } catch (error) {
      if (error instanceof IrbError) throw error
      if (error instanceof RepStoreError) throw new IrbError('STORE_ERROR', error.message)
      throw new IrbError('STORE_ERROR', `could not store the evidence: ${(error as Error).message}`)
    }
  }

  /** Assess risk from flags. */
  risk(answers: RiskAnswers): RiskResult {
    return assessRisk(answers ?? {})
  }

  /** Export Markdown + SARIF. */
  export(analysis: IrbAnalysis, risk?: RiskResult, title?: string): { markdown: string; sarif: Record<string, unknown> } {
    return { markdown: renderIrbMarkdown(analysis, risk, title ?? 'Ethics application checklist'), sarif: renderIrbSarif(analysis, risk, VERSION) }
  }
}
