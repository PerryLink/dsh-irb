/**
 * Shared tool schema fragments and runtime argument guards.
 * @module dsh-irb/tools/shared
 */

import type { IrbAnalysis } from '../analyze.ts'
import type { RiskResult } from '../checklist.ts'

/** The failure branch. */
export const ERROR_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    code: { type: 'string', required: true },
    message: { type: 'string', required: true },
  },
} as const

/** True for a plain non-array object. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Check that a value is structurally an {@link IrbAnalysis}. The analysis is
 * normally returned by `irb_check`, but a model can pass arbitrary JSON here, so
 * malformed input must become `INVALID_INPUT` instead of a renderer TypeError.
 * @param value - the candidate analysis.
 * @returns a human-readable problem, or undefined when it is usable.
 */
export function analysisProblem(value: unknown): string | undefined {
  if (!isRecord(value)) return 'analysis must be an object'
  if (!Array.isArray(value['findings'])) return 'analysis.findings must be an array'
  for (const finding of value['findings']) {
    if (!isRecord(finding)) return 'analysis.findings entries must be objects'
    if (typeof finding['id'] !== 'string') return 'finding.id must be a string'
    if (typeof finding['label'] !== 'string') return 'finding.label must be a string'
    if (finding['status'] !== 'present' && finding['status'] !== 'missing') return 'finding.status must be present or missing'
    if (finding['severity'] !== 'info' && finding['severity'] !== 'warning') return 'finding.severity must be info or warning'
    if (finding['advice'] !== undefined && typeof finding['advice'] !== 'string') return 'finding.advice must be a string'
    const locator = finding['locator']
    if (locator !== undefined) {
      if (!isRecord(locator)) return 'finding.locator must be an object'
      if (typeof locator['charStart'] !== 'number' || typeof locator['charEnd'] !== 'number') return 'finding.locator needs numeric charStart/charEnd'
      if (typeof locator['match'] !== 'string') return 'finding.locator.match must be a string'
    }
  }
  if (typeof value['present'] !== 'number' || typeof value['total'] !== 'number' || typeof value['coverage'] !== 'number') {
    return 'analysis.present/total/coverage must be numbers'
  }
  if (!Array.isArray(value['coreMissing']) || value['coreMissing'].some(item => typeof item !== 'string')) {
    return 'analysis.coreMissing must be an array of strings'
  }
  if (!Array.isArray(value['notes']) || value['notes'].some(item => typeof item !== 'string')) {
    return 'analysis.notes must be an array of strings'
  }
  if (typeof value['wordCount'] !== 'number') return 'analysis.wordCount must be a number'
  return undefined
}

/**
 * Check that a value is structurally a {@link RiskResult}.
 * @param value - the candidate risk result.
 * @returns a human-readable problem, or undefined when it is usable.
 */
export function riskProblem(value: unknown): string | undefined {
  if (!isRecord(value)) return 'risk must be an object'
  if (!['minimal', 'greater_than_minimal', 'uncertain'].includes(value['level'] as string)) {
    return 'risk.level must be minimal, greater_than_minimal or uncertain'
  }
  if (!Array.isArray(value['factors']) || value['factors'].some(item => typeof item !== 'string')) {
    return 'risk.factors must be an array of strings'
  }
  if (!Array.isArray(value['safeguards']) || value['safeguards'].some(item => typeof item !== 'string')) {
    return 'risk.safeguards must be an array of strings'
  }
  if (typeof value['advisory'] !== 'string') return 'risk.advisory must be a string'
  return undefined
}

/** Cast a validated value for the typed renderers. */
export function asAnalysis(value: unknown): IrbAnalysis {
  return value as IrbAnalysis
}

/** Cast a validated value for the typed renderers. */
export function asRisk(value: unknown): RiskResult {
  return value as RiskResult
}
