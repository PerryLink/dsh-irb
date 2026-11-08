/**
 * `irb_risk` — advisory risk level from structured flags.
 * @module dsh-irb/tools/irb-risk
 */

import { defineTool } from '@deepseek-ai/dsh-tools'
import type { IrbRuntime } from '../runtime.ts'
import { ERROR_SCHEMA } from './shared.ts'

const FLAG = { type: 'boolean' } as const

const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ok: { type: 'boolean', required: true },
    risk: { type: 'json' },
    error: ERROR_SCHEMA,
  },
} as const

/**
 * Build the `irb_risk` tool.
 * @param runtime - the runtime.
 * @returns the tool definition.
 */
export function makeIrbRiskTool(runtime: IrbRuntime) {
  return defineTool({
    name: 'irb_risk',
    description: [
      'Assess the advisory ethics risk level from structured flags (dsh-irb).',
      '',
      'Vulnerable groups, minors, prisoners, pregnant women, cognitive impairment, deception, sensitive topics, invasive procedures, biological samples, genetic data, human challenge, gene therapy and automated decisions each raise the level and add the corresponding safeguard. Advisory only — the ethics committee decides.',
    ].join('\n'),
    parameters: {
      vulnerableGroups: FLAG,
      minors: FLAG,
      prisoners: FLAG,
      pregnantWomen: FLAG,
      cognitiveImpairment: FLAG,
      deception: FLAG,
      sensitiveTopics: FLAG,
      invasiveProcedure: FLAG,
      biologicalSamples: FLAG,
      geneticData: FLAG,
      humanChallenge: FLAG,
      geneTherapy: FLAG,
      aiDecisionMaking: FLAG,
    },
    output: {
      schema: OUTPUT_SCHEMA,
      render: (_args, value) => {
        const result = value as { ok: true; risk: { level: string; factors: string[]; safeguards: string[] } } | { ok: false; error: { code: string; message: string } }
        if (!result.ok) return [{ type: 'text', text: `irb_risk failed (${result.error.code}): ${result.error.message}` }]
        return [{ type: 'text', text: `irb_risk: ${result.risk.level}${result.risk.factors.length === 0 ? '' : ` — ${result.risk.factors.join(', ')}`}; ${result.risk.safeguards.length} safeguard(s) advised` }]
      },
    },
    async execute(args: unknown) {
      if (args !== undefined && (typeof args !== 'object' || args === null || Array.isArray(args))) {
        return { ok: false as const, error: { code: 'INVALID_INPUT', message: 'pass risk flags as an object' } }
      }
      return { ok: true as const, risk: runtime.risk((args ?? {}) as Parameters<IrbRuntime['risk']>[0]) as never }
    },
  })
}
