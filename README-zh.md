# dsh-irb

**赶在伦理委员会之前把申请材料准备好——并知道哪些核心陈述还缺着。**

*面向伦理申请的 18 项关键词清单、一个建议性风险等级及其对应的保障措施，以及可随材料提交的 Markdown + SARIF 导出。*

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24.9-brightgreen.svg)]()

[English](README.md) · 简体中文

---

## 它做什么

- **`irb_check`** — 18 项：标题、PI/联系人、目的、设计、参与者/入选条件、招募、知情同意、未成年人赞同、风险、获益、保密/数据保护、弱势群体、补偿、利益冲突、保存、传播、动物伦理（3Rs）、生物安全/人体样本。已具备的项会给出字符位置；缺失的核心项会给出建议。
- **`irb_risk`** — 结构化标记（弱势群体、未成年人、囚犯、妊娠、认知障碍、欺骗、敏感话题、侵入性操作、生物样本、遗传数据、人体挑战、基因治疗、自动化决策）→ 建议等级，以及每个因素所需的保障措施。
- **`irb_export`** — Markdown（条目表、风险表、保障措施）+ SARIF 2.1.0；检查申请时还会写入 REP 证据。

## 它不做什么

- **不批准、不提供法律意见。** 清单不能替代 IRB/IACUC 的决定；导出件中会写明这一点。
- **不做充分性判断。** 只检测某项陈述是否存在，不判断是否充分。
- **没有风险分级标准。** 等级仅供参考，必须由委员会确认。
- **不处理 DOCX/PDF。** 请转换为 `.md`/`.txt`（PDF 文本可用 `dsh-doc-anchor`）。
- **不接入提交门户。**

## 风险因素与保障措施

| 标记 | 建议的保障措施 |
|---|---|
| 弱势群体 | 额外的同意/赞同流程与独立监督 |
| 未成年人 | 适龄的赞同 + 父母同意 |
| 囚犯 | 独立代言人及防胁迫保护 |
| 孕妇/胎儿 | 针对胎儿与母体的专项风险评估 |
| 认知障碍 | 行为能力评估与法定代理人同意 |
| 欺骗 | 事后说明，并说明为何可豁免完整告知 |
| 敏感话题 | 转介路径与访谈员培训 |
| 侵入性操作 | 临床监督、不良事件报告、停止规则 |
| 生物样本 | 样本处理、生物安全、二次使用同意 |
| 遗传数据 | 专项同意与偶然发现政策 |
| 人体挑战 | 安全监测委员会与剂量递增规则 |
| 基因治疗 | 长期随访与监管批准 |
| 自动化决策 | 人工复核与申诉渠道 |

## 工具

### `irb_check`

`{ text? | path?, persist? }` → `{ ok, analysis, evidenceId?, recordPath? }`.

### `irb_risk`

`{ vulnerableGroups?, minors?, prisoners?, pregnantWomen?, cognitiveImpairment?, deception?, sensitiveTopics?, invasiveProcedure?, biologicalSamples?, geneticData?, humanChallenge?, geneTherapy?, aiDecisionMaking? }` → `{ ok, risk }`.

### `irb_export`

`{ analysis, risk?, title? }` → `{ ok, markdown, sarif }`.

### 错误码

`INVALID_INPUT` · `NOT_FOUND` · `PATH_ESCAPE` · `NOT_A_FILE` · `TOO_LARGE` · `UNSUPPORTED_FILE` · `STORE_ERROR`

## 兼容性与安装

| | |
|---|---|
| DeepSeek Harness | **`dsh-v0.2.1-rc.5`**（2026-11-08 实测）；peer `>=0.2.1-0 <0.3.0 \|\| >=0.2.2-0 <0.3.0` |
| Node | `^22.19.0 \|\| >=24.9.0`（实测 `24.22.1`），仅 ESM |
| Peer 依赖 | `@perrylink/dsh-research-core ^0.1.0`、`@deepseek-ai/cordis ^4.0.5-alpha.1`、`@deepseek-ai/dsh-tools`、`@deepseek-ai/schemastery ^3.18.5-alpha.1` |
| 运行时依赖 | **零** |

```sh
dsh plugin --profile <name> add @perrylink/dsh-research-core dsh-irb
dsh --profile <name> --dump-config | grep dsh-irb
```

## 配置

| 键 | 默认值 | 含义 |
|---|---|---|
| `enabled` | `true` | `false` 时不挂载任何内容 |
| `root` | `.irb` | 存储/记录根目录 |
| `workspaceRoot` | `process.cwd()` | 申请文件路径必须解析到该目录内 |
| `maxChars` | `1000000` | 字符上限（超限即失败，绝不截断） |
| `persist` | `true` | 把检查过的申请存为 REP 证据 + 记录 |

## 安全边界

- 对申请文件只读；只在 `root` 下写入。
- `realpath` 包含性校验；DOCX/PDF 会被拒绝并给出转换提示。
- `persist: true`（默认值）时，检查过的申请文本会作为 REP 证据存到 `root` 下；其中可能含个人数据，请相应设置 `persist: false` 或保护该存储。
- 申请文本视为数据；指令性内容永远不会被执行。

## 评测

**13 个测试**：清单的已具备/缺失项与核心缺失列表、泛泛的同意/伦理委员会提及不会被误认为赞同/动物内容、空文本拒绝、最小风险、未成年人 + 欺骗的保障措施、全部十一个风险标记、运行时（REP 记录有效性、可选缺失项记为 skipped、路径穿越/二进制/超大/空内容拒绝）、畸形 analysis/risk 的工具防护、工具 schema、check→risk→export 端到端、失败分支、包契约。

不宣称任何基准成绩：关键词是否出现由 fixture 固定；没有伦理申请的人工标注语料。

## 已知限制（v0.1）

- 仅支持英文/中文关键词线索；换一种措辞的陈述可能漏检。
- 风险标记来自调用方，而不是申请文本。
- 没有特定司法辖区的规则（HIPAA、GDPR、涉及人的生命科学和医学研究伦理审查办法的细节）。
- 除 3Rs 关键词检查外，不检查动物实验方案的章节结构。

## 许可

Apache-2.0。运行时零第三方代码。
