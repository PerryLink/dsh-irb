/**
 * `irb_export` — Markdown checklist + SARIF.
 * @module dsh-irb/tools/irb-export
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
import type { IrbRuntime } from '../runtime.ts'
import type { IrbAnalysis } from '../analyze.ts'
import type { RiskResult } from '../checklist.ts'
import { ERROR_SCHEMA, analysisProblem, asAnalysis, asRisk, riskProblem } from './shared.ts'

const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ok: { type: 'boolean', required: true },
    markdown: { type: 'string' },
    sarif: { type: 'json' },
    error: ERROR_SCHEMA,
  },
} as const

/**
 * Build the `irb_export` tool.
 * @param runtime - the runtime.
 * @returns the tool definition.
 */
export function makeIrbExportTool(runtime: IrbRuntime) {
  return defineTool({
    name: 'irb_export',
    description: [
      'Export an ethics checklist as Markdown + SARIF 2.1.0 (dsh-irb).',
      '',
      'Combines the irb_check analysis (item table with locators/advice) and, when supplied, the irb_risk assessment (factors and safeguards). The export states that it is a checklist, not an approval.',
    ].join('\n'),
    parameters: {
      analysis: { type: 'json', required: true, description: 'The analysis from irb_check.' },
      risk: { type: 'json', description: 'The risk result from irb_risk.' },
      title: { type: 'string', description: 'Document title.' },
    },
    output: {
      schema: OUTPUT_SCHEMA,
      render: (_args, value) => {
        const result = value as { ok: true; markdown: string } | { ok: false; error: { code: string; message: string } }
        if (!result.ok) return [{ type: 'text', text: `irb_export failed (${result.error.code}): ${result.error.message}` }]
        return [{ type: 'text', text: result.markdown }]
      },
    },
    async execute(args: unknown) {
      if (typeof args !== 'object' || args === null) {
        return { ok: false as const, error: { code: 'INVALID_INPUT', message: 'pass the analysis object from irb_check' } }
      }
      const request = args as { analysis?: IrbAnalysis; risk?: RiskResult; title?: string }
      const problem = analysisProblem(request.analysis)
      if (problem !== undefined) {
        return { ok: false as const, error: { code: 'INVALID_INPUT', message: `pass the analysis object from irb_check (${problem})` } }
      }
      if (request.risk !== undefined) {
        const riskIssue = riskProblem(request.risk)
        if (riskIssue !== undefined) {
          return { ok: false as const, error: { code: 'INVALID_INPUT', message: `pass the risk object from irb_risk (${riskIssue})` } }
        }
      }
      if (request.title !== undefined && typeof request.title !== 'string') {
        return { ok: false as const, error: { code: 'INVALID_INPUT', message: 'title must be a string' } }
      }
      const result = runtime.export(
        asAnalysis(request.analysis),
        request.risk === undefined ? undefined : asRisk(request.risk),
        request.title,
      )
      return { ok: true as const, markdown: result.markdown, sarif: result.sarif as never }
    },
  })
}
