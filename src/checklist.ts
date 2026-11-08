/**
 * Ethics-application checklist: items, detection patterns and risk assessment.
 *
 * These are **starter checks** for the material an ethics committee usually
 * asks for. They detect whether a statement exists, not whether it is adequate,
 * and they do not replace an IRB/IACUC decision. Risk levels are advisory.
 *
 * @module dsh-irb/checklist
 */

/** One checklist item. */
export interface IrbItem {
  readonly id: string
  readonly label: string
  readonly patterns: readonly RegExp[]
  readonly advice: string
  readonly core: boolean
}

/** Checklist item catalogue. */
export const IRB_ITEMS: readonly IrbItem[] = [
  { id: 'title', label: 'Protocol title', patterns: [/研究(?:题目|名称)|项目名称|protocol title|title/iu], advice: 'state the protocol title exactly as it will be registered', core: true },
  { id: 'pi', label: 'Principal investigator and contact', patterns: [/主要研究者|项目负责人|principal investigator|\bPI\b|研究者/iu], advice: 'name the PI and a contact', core: true },
  { id: 'purpose', label: 'Purpose and rationale', patterns: [/研究目的|研究背景|purpose|rationale|background/iu], advice: 'state the purpose and the evidence gap', core: true },
  { id: 'design', label: 'Study design', patterns: [/研究设计|study design|随机|对照|队列|横断面| randomised|randomized/iu], advice: 'describe the design and analysis', core: true },
  { id: 'participants', label: 'Participants and eligibility', patterns: [/受试者|研究对象|纳入标准|排除标准|eligib|participants/iu], advice: 'give eligibility criteria and the target sample size', core: true },
  { id: 'recruitment', label: 'Recruitment', patterns: [/招募|recruit/iu], advice: 'describe how participants are approached', core: true },
  { id: 'consent', label: 'Informed consent process', patterns: [/知情同意|informed consent|consent form|同意书/iu], advice: 'describe who obtains consent, when, and how capacity is assessed', core: true },
  { id: 'assent', label: 'Assent for minors', patterns: [/知情同意|assent|未成年人|未成年/iu], advice: 'for minors, include an age-appropriate assent process', core: false },
  { id: 'risks', label: 'Risks and mitigation', patterns: [/风险|risk|不良事件|adverse/iu], advice: 'list physical, psychological, social and economic risks and how they are minimised', core: true },
  { id: 'benefits', label: 'Benefits', patterns: [/受益|benefit/iu], advice: 'state direct and societal benefits without overclaiming', core: false },
  { id: 'confidentiality', label: 'Confidentiality and data protection', patterns: [/保密|confidential|数据保护|data protection|个人信息/iu], advice: 'describe de-identification, storage, access control and transfer', core: true },
  { id: 'vulnerable', label: 'Vulnerable participants', patterns: [/弱势|vulnerab|儿童|未成年人|孕妇|囚犯|prisoner|pregnan|认知障碍/iu], advice: 'name any vulnerable group and the additional safeguards', core: false },
  { id: 'compensation', label: 'Compensation and reimbursement', patterns: [/补偿|报酬|compensation|reimburs/iu], advice: 'state compensation without creating undue inducement', core: false },
  { id: 'conflicts', label: 'Conflicts of interest', patterns: [/利益冲突|conflict of interest/iu], advice: 'declare conflicts and how they are managed', core: false },
  { id: 'retention', label: 'Data and sample retention', patterns: [/保存|留存|retention|销毁|destroy/iu], advice: 'state retention periods, storage and destruction', core: true },
  { id: 'dissemination', label: 'Dissemination', patterns: [/发表|发布|dissemin|publication/iu], advice: 'describe how results will be reported (including negative results)', core: false },
  { id: 'animal', label: 'Animal ethics (3Rs, IACUC)', patterns: [/动物|animal|3R|IACUC|伦理委员会/iu], advice: 'for animal work: justify species/numbers, describe the 3Rs and IACUC approval', core: false },
  { id: 'biosafety', label: 'Biosafety / human samples', patterns: [/生物安全|biosafety|人体样本|生物样本|blood sample|tissue/iu], advice: 'describe biosafety approvals and human-sample handling', core: false },
]

/** Risk factors. */
export interface RiskAnswers {
  readonly vulnerableGroups?: boolean
  readonly deception?: boolean
  readonly sensitiveTopics?: boolean
  readonly invasiveProcedure?: boolean
  readonly biologicalSamples?: boolean
  readonly geneticData?: boolean
  readonly minors?: boolean
  readonly prisoners?: boolean
  readonly pregnantWomen?: boolean
  readonly cognitiveImpairment?: boolean
  readonly humanChallenge?: boolean
  readonly geneTherapy?: boolean
  readonly aiDecisionMaking?: boolean
}

/** Risk assessment. */
export interface RiskResult {
  readonly level: 'minimal' | 'greater_than_minimal' | 'uncertain'
  readonly factors: readonly string[]
  readonly safeguards: readonly string[]
  readonly advisory: string
}

/**
 * Assess the ethics risk level from structured answers.
 * @param answers - the risk flags.
 * @returns the advisory level, contributing factors and required safeguards.
 */
export function assessRisk(answers: RiskAnswers): RiskResult {
  const factors: string[] = []
  const safeguards: string[] = []
  const add = (flag: boolean | undefined, label: string, safeguard: string): void => {
    if (flag === true) {
      factors.push(label)
      safeguards.push(safeguard)
    }
  }
  add(answers.vulnerableGroups, 'vulnerable participants', 'extra consent/assent procedures and independent oversight')
  add(answers.minors, 'minors', 'age-appropriate assent plus parental consent')
  add(answers.prisoners, 'prisoners', 'independent advocate and protections against coercion')
  add(answers.pregnantWomen, 'pregnant women or fetuses', 'specific risk assessment for the fetus and the pregnant person')
  add(answers.cognitiveImpairment, 'cognitive impairment', 'capacity assessment and legally authorised representative consent')
  add(answers.deception, 'deception or incomplete disclosure', 'debriefing protocol and a justified waiver of full disclosure')
  add(answers.sensitiveTopics, 'sensitive topics', 'referral pathways and interviewer training for distress')
  add(answers.invasiveProcedure, 'invasive procedure', 'clinical oversight, adverse-event reporting and stopping rules')
  add(answers.biologicalSamples, 'biological samples', 'sample-handling, biosafety and secondary-use consent')
  add(answers.geneticData, 'genetic data', 'specific consent for genetic testing and incidental-finding policy')
  add(answers.humanChallenge, 'human challenge / first-in-human', 'safety monitoring board and dose-escalation rules')
  add(answers.geneTherapy, 'gene therapy', 'long-term follow-up and regulatory approval')
  add(answers.aiDecisionMaking, 'automated decision-making about participants', 'human review and an appeal route for automated decisions')
  const level: RiskResult['level'] = factors.length === 0 ? 'minimal' : 'greater_than_minimal'
  return {
    level,
    factors,
    safeguards,
    advisory: 'Advisory only: the risk level and safeguards must be confirmed by the ethics committee; this tool cannot approve a study.',
  }
}
