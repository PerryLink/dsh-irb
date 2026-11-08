# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- The "Assent for minors" item no longer matches generic informed-consent text,
  and the animal-ethics item no longer matches a bare "ethics committee"
  mention; both inflated coverage without evidence of the actual statement.
- Missing optional checklist items are recorded as `skipped`/`not_applicable`
  in REP evidence instead of `pass`.
- `irb_export` validates the supplied analysis/risk objects and returns
  `INVALID_INPUT` instead of throwing in the renderer.
- Package author corrected to the irb contributors.
- Regression tests for the keyword and malformed-analysis paths (13 total).


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
