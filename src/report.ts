/**
 * Markdown and SARIF rendering for ethics checks.
 * @module dsh-irb/report
 */

import type { IrbAnalysis } from './analyze.ts'
import type { RiskResult } from './checklist.ts'

/** Render the checklist as Markdown. */
export function renderIrbMarkdown(analysis: IrbAnalysis, risk?: RiskResult, title = 'Ethics application checklist'): string {
  const lines = [`# ${title}`, '']
  lines.push(`**Coverage:** ${analysis.present}/${analysis.total} (${(analysis.coverage * 100).toFixed(0)}%) · **core items missing:** ${analysis.coreMissing.length}`)
  lines.push('')
  if (risk !== undefined) {
    lines.push(`**Risk (advisory):** ${risk.level}${risk.factors.length === 0 ? '' : ` — ${risk.factors.join(', ')}`}`)
    if (risk.safeguards.length > 0) {
      lines.push('')
      lines.push('| Factor | Required safeguard |')
      lines.push('|---|---|')
      for (const [index, factor] of risk.factors.entries()) lines.push(`| ${factor} | ${risk.safeguards[index] ?? ''} |`)
    }
    lines.push('')
  }
  lines.push('| Item | Status | Advice |')
  lines.push('|---|---|---|')
  for (const finding of analysis.findings) {
    lines.push(`| ${finding.label} | ${finding.status === 'present' ? 'present' : finding.severity === 'warning' ? '**missing (core)**' : 'missing (optional)'} | ${finding.advice ?? ''} |`)
  }
  lines.push('')
  lines.push(`> ${analysis.notes.join('; ')}.`)
  return `${lines.join('\n')}\n`
}

/** Render missing core items and risk factors as SARIF. */
export function renderIrbSarif(analysis: IrbAnalysis, risk: RiskResult | undefined, version: string): Record<string, unknown> {
  const results: Array<Record<string, unknown>> = analysis.findings
    .filter(finding => finding.status === 'missing' && finding.severity === 'warning')
    .map(finding => ({ ruleId: `irb/${finding.id}`, level: 'warning' as const, message: { text: `Missing: ${finding.label} — ${finding.advice ?? ''}` } }))
  if (risk !== undefined) {
    results.push({ ruleId: 'irb/risk', level: risk.level === 'minimal' ? ('note' as const) : ('warning' as const), message: { text: `Advisory risk level: ${risk.level}${risk.factors.length === 0 ? '' : ` (${risk.factors.join(', ')})`}` } })
  }
  return {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [{ tool: { driver: { name: 'dsh-irb', version } }, results }],
  }
}
