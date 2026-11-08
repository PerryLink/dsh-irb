/**
 * `irb_check` — ethics-application checklist.
 * @module dsh-irb/tools/irb-check
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
import { IrbError, type IrbRuntime } from '../runtime.ts'
import { ERROR_SCHEMA } from './shared.ts'

const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ok: { type: 'boolean', required: true },
    analysis: { type: 'json' },
    evidenceId: { type: 'string' },
    recordPath: { type: 'string' },
    error: ERROR_SCHEMA,
  },
} as const

/**
 * Build the `irb_check` tool.
 * @param runtime - the runtime.
 * @returns the tool definition.
 */
export function makeIrbCheckTool(runtime: IrbRuntime) {
  return defineTool({
    name: 'irb_check',
    description: [
      'Check an ethics application against a starter checklist (dsh-irb).',
      '',
      'Covers 18 items: title, PI, purpose, design, participants/eligibility, recruitment, informed consent, assent, risks, benefits, confidentiality/data protection, vulnerable groups, compensation, conflicts, retention, dissemination, animal ethics (3Rs) and biosafety/human samples. Present items get locators; missing ones get advice.',
      '',
      'Keyword presence only: this is not an adequacy judgement and not an IRB decision.',
    ].join('\n'),
    parameters: {
      text: { type: 'string', description: 'Application text (mutually exclusive with path).' },
      path: { type: 'string', description: 'Workspace-relative .md/.txt application.' },
      persist: { type: 'boolean', description: 'Store the application as REP evidence + record (default true).' },
    },
    output: {
      schema: OUTPUT_SCHEMA,
      render: (_args, value) => {
        const result = value as { ok: true; analysis: { present: number; total: number; coverage: number; coreMissing: string[] } } | { ok: false; error: { code: string; message: string } }
        if (!result.ok) return [{ type: 'text', text: `irb_check failed (${result.error.code}): ${result.error.message}` }]
        return [{ type: 'text', text: `irb_check: ${result.analysis.present}/${result.analysis.total} (${(result.analysis.coverage * 100).toFixed(0)}%); core items missing ${result.analysis.coreMissing.length}` }]
      },
    },
    async execute(args: unknown) {
      if (typeof args !== 'object' || args === null) {
        return { ok: false as const, error: { code: 'INVALID_INPUT', message: 'pass text or path' } }
      }
      const request = args as { text?: string; path?: string; persist?: boolean }
      try {
        const result = await runtime.check({
          ...(request.text === undefined ? {} : { text: request.text }),
          ...(request.path === undefined ? {} : { path: request.path }),
          ...(request.persist === undefined ? {} : { persist: request.persist }),
        })
        return {
          ok: true as const,
          analysis: result.analysis as never,
          ...(result.evidenceId === undefined ? {} : { evidenceId: result.evidenceId }),
          ...(result.recordPath === undefined ? {} : { recordPath: result.recordPath }),
        }
      } catch (error) {
        if (error instanceof IrbError) return { ok: false as const, error: { code: error.code, message: error.message } }
        throw error
      }
    },
  })
}
