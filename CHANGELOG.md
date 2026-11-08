# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-11-08

First release: ethics-application checklist.

### Added

- `irb_check`: 18-item keyword checklist with character locators for present
  items and advice for missing ones; the checked application becomes REP
  evidence with one check per item.
- `irb_risk`: advisory risk level from thirteen structured flags, with the
  safeguard each factor implies.
- `irb_export`: Markdown checklist + risk table + SARIF 2.1.0.
- 11 tests.

### Notes

- Not an IRB decision and not legal advice; the export states this.
- Keyword presence only: adequacy is a human judgement.
- English/Chinese cues only; no jurisdiction-specific rules.
