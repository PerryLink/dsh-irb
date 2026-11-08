/**
 * `dsh-irb` — ethics-application checklist, advisory risk level and export.
 *
 * Three tools: irb_check, irb_risk, irb_export. Keyword-based; not an IRB
 * decision and not legal advice.
 *
 * Function plugin — no default export.
 * @module dsh-irb
 */

import type { Context } from '@deepseek-ai/cordis'
import { Config, resolveConfig, type Config as ConfigShape } from './config.ts'
import { IrbRuntime, type EvidencePort } from './runtime.ts'
import { makeIrbCheckTool } from './tools/irb-check.ts'
import { makeIrbExportTool } from './tools/irb-export.ts'
import { makeIrbRiskTool } from './tools/irb-risk.ts'

/** Cordis plugin name. */
export const name = 'irb'

/** The tool registry is required; the REP service is optional. */
export const inject = ['tools']

export { Config, resolveConfig }
export type { ConfigShape }
export type { ResolvedConfig } from './config.ts'
export { VERSION } from './version.ts'
export { analyzeIrb } from './analyze.ts'
export type { IrbAnalysis, IrbFinding } from './analyze.ts'
export { assessRisk, IRB_ITEMS } from './checklist.ts'
export type { IrbItem, RiskAnswers, RiskResult } from './checklist.ts'
export { renderIrbMarkdown, renderIrbSarif } from './report.ts'
export { IrbError, IrbRuntime } from './runtime.ts'
export type { CheckValue, EvidencePort, IrbErrorCode, IrbRuntimeOptions } from './runtime.ts'
export { makeIrbCheckTool } from './tools/irb-check.ts'
export { makeIrbRiskTool } from './tools/irb-risk.ts'
export { makeIrbExportTool } from './tools/irb-export.ts'

/**
 * Mount the three tools.
 * @param ctx - the plugin context (host).
 * @param config - raw plugin config.
 */
export function apply(ctx: Context, config: ConfigShape): void {
  const resolved = resolveConfig(config)
  const logger = ctx.logger('irb')
  if (!resolved.enabled) {
    logger.info('disabled: enabled is false — no tools are mounted')
    return
  }
  const service = ctx.get('researchEvidence') as EvidencePort | undefined
  const runtime = new IrbRuntime({ config: resolved, ...(service === undefined ? {} : { service }) })
  if (service === undefined) {
    logger.info(`ctx.researchEvidence is not mounted; using a local core store under ${resolved.root}`)
  }
  ctx.effect(() => ctx.tools.register(makeIrbCheckTool(runtime)), 'irb: irb_check tool')
  ctx.effect(() => ctx.tools.register(makeIrbRiskTool(runtime)), 'irb: irb_risk tool')
  ctx.effect(() => ctx.tools.register(makeIrbExportTool(runtime)), 'irb: irb_export tool')
}
