/**
 * Text analysis for the ethics-application checklist.
 * @module dsh-irb/analyze
 */

import { IRB_ITEMS, type IrbItem } from './checklist.ts'

/** One finding. */
export interface IrbFinding {
  readonly id: string
  readonly label: string
  readonly status: 'present' | 'missing'
  readonly severity: 'info' | 'warning'
  readonly locator?: { readonly charStart: number; readonly charEnd: number; readonly match: string }
  readonly advice?: string
}

/** Analysis result. */
export interface IrbAnalysis {
  readonly findings: readonly IrbFinding[]
  readonly present: number
  readonly total: number
  readonly coverage: number
  readonly coreMissing: readonly string[]
  readonly wordCount: number
  readonly notes: readonly string[]
}

/** Check one item. */
function checkItem(text: string, item: IrbItem): IrbFinding {
  for (const pattern of item.patterns) {
    pattern.lastIndex = 0
    const match = pattern.exec(text)
    if (match !== null) {
      return {
        id: item.id,
        label: item.label,
        status: 'present',
        severity: 'info',
        locator: { charStart: match.index, charEnd: match.index + match[0].length, match: match[0].slice(0, 60) },
      }
    }
  }
  return { id: item.id, label: item.label, status: 'missing', severity: item.core ? 'warning' : 'info', advice: item.advice }
}

/**
 * Analyze ethics-application text.
 * @param text - the application text.
 * @returns findings, coverage and notes.
 */
export function analyzeIrb(text: string): IrbAnalysis {
  if (typeof text !== 'string' || text.trim() === '') throw new RangeError('the application text is empty')
  const findings = IRB_ITEMS.map(item => checkItem(text, item))
  const present = findings.filter(finding => finding.status === 'present').length
  const coverage = Number((present / IRB_ITEMS.length).toFixed(4))
  const coreMissing = findings.filter(finding => finding.status === 'missing' && finding.severity === 'warning').map(finding => finding.id)
  const notes = [
    'checked by keyword presence; a present statement is not an adequacy judgement',
    'not a replacement for the ethics committee decision',
  ]
  return { findings, present, total: IRB_ITEMS.length, coverage, coreMissing, wordCount: text.replace(/\s/gu, '').length, notes }
}
