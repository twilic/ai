# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-08-04

Initial public release of `@twilic/ai`, `@twilic/ai-openai`, `@twilic/ai-sdk`, and `@twilic/ai-agents`. Version 0.1.0 was published locally without npm trusted publishing and is not part of the canonical release line.

### Added

- `@twilic/ai` core session recorder, `.twai` codec, replay, inspect, diff, and convert helpers.
- `@twilic/ai-openai` OpenAI Responses API normalization utilities.
- `@twilic/ai-sdk` Vercel AI SDK-compatible transport and recorder.
- `@twilic/ai-agents` Agents SDK tracing processor mapping.
- Synthetic fixtures, benchmarks, web inspector, and examples.
- Integration tests for core e2e flows, OpenAI normalize roundtrips, Agents tracing persistence, and AI SDK transport over mock HTTP.
- CI workflows for format, lint, typecheck, tests, commitlint, and PR body validation.
- npm publish workflow with [trusted publishing (OIDC)](https://docs.npmjs.com/trusted-publishers/).

### Fixed

- Revive nested BigInt values after `.twai` decode so JSON conversion succeeds.
