# Contributing

Thank you for improving Twilic AI.

## Development

Requirements: Node.js 24+, pnpm 10.18.1

```bash
pnpm install
pnpm build
pnpm test
pnpm fmt:check
pnpm lint
```

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/) with lowercase subject lines.

## Packages

- `packages/core` — publishable `@twilic/ai`
- `packages/openai` — `@twilic/ai-openai`
- `packages/ai-sdk` — `@twilic/ai-sdk`
- `packages/agents` — `@twilic/ai-agents`

## Releasing

Publishable packages share one version. Keep all four `package.json` versions in sync.

1. Bump versions in `packages/{core,openai,ai-sdk,agents}/package.json`.
2. Update `docs/CHANGELOG.md`.
3. Commit, push to `main`, then tag:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The [Publish NPM](../.github/workflows/publish-npm.yml) workflow builds with pnpm, then publishes each package with `npm publish --access public --provenance` (OIDC trusted publishing).

Before the first release, configure Trusted Publisher on npmjs.com for each package:

- Repository: `twilic/ai`
- Workflow: `publish-npm.yml`
- Packages: `@twilic/ai`, `@twilic/ai-openai`, `@twilic/ai-sdk`, `@twilic/ai-agents`

By contributing, you agree that your contribution may be distributed under the MIT license.
