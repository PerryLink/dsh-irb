/**
 * Checklist analysis and advisory risk assessment.
 * @module test/irb.spec
 */

import { describe, expect, it } from 'vitest'
import { analyzeIrb } from '../src/analyze.ts'
import { assessRisk, IRB_ITEMS } from '../src/checklist.ts'

const APPLICATION = `研究题目：合成数据下的知情同意流程评估
主要研究者：张三，联系方式 test@example.org
研究目的：评估不同知情同意表述对理解程度的影响。
研究设计：随机对照试验，两组平行。
受试者与纳入标准：成年志愿者；排除标准：认知障碍。
招募：通过公开广告招募。
知情同意：由研究助理当面获取书面知情同意。
风险：参与者可能感到轻微疲劳；已说明可随时退出。
受益：无直接受益，结果将用于改进同意书。
保密与数据保护：数据去标识后存放在加密服务器，仅研究团队可访问。
保存与销毁：数据保存 5 年后销毁。
发表：结果将发表，包括阴性结果。
利益冲突：无。
`

describe('checklist', () => {
  it('finds present items and flags missing core ones', () => {
    const analysis = analyzeIrb(APPLICATION)
    expect(analysis.total).toBe(IRB_ITEMS.length)
    expect(analysis.findings.find(finding => finding.id === 'consent')?.status).toBe('present')
    expect(analysis.findings.find(finding => finding.id === 'confidentiality')?.status).toBe('present')
    expect(analysis.findings.find(finding => finding.id === 'animal')?.status).toBe('missing')
    expect(analysis.coreMissing).not.toContain('consent')
  })

  it('rejects empty text', () => {
    expect(() => analyzeIrb('   ')).toThrow(RangeError)
  })
})

describe('risk', () => {
  it('is minimal when no flag is set', () => {
    const result = assessRisk({})
    expect(result.level).toBe('minimal')
    expect(result.factors).toEqual([])
  })

  it('raises the level and adds safeguards for vulnerable participants', () => {
    const result = assessRisk({ minors: true, deception: true })
    expect(result.level).toBe('greater_than_minimal')
    expect(result.factors).toContain('minors')
    expect(result.safeguards.join(' ')).toContain('assent')
    expect(result.safeguards.join(' ')).toContain('debriefing')
    expect(result.advisory).toContain('Advisory only')
  })

  it('handles the remaining flags', () => {
    const result = assessRisk({ prisoners: true, pregnantWomen: true, cognitiveImpairment: true, sensitiveTopics: true, invasiveProcedure: true, biologicalSamples: true, geneticData: true, humanChallenge: true, geneTherapy: true, aiDecisionMaking: true, vulnerableGroups: true })
    expect(result.factors).toHaveLength(11)
    expect(result.safeguards).toHaveLength(11)
  })
})
