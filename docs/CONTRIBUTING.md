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

`0.1.0` was published locally to create the npm packages. Configure Trusted Publisher on npmjs.com for each package, then use OIDC for `1.0.0` and later:

- Repository: `twilic/ai`
- Workflow: `publish-npm.yml`
- Packages: `@twilic/ai`, `@twilic/ai-openai`, `@twilic/ai-sdk`, `@twilic/ai-agents`

1. Bump versions in `packages/{core,openai,ai-sdk,agents}/package.json`.
2. Update `docs/CHANGELOG.md` (release notes use that version section).
3. Commit, push to `main`, then tag:

```bash
git tag v1.0.0
git push origin v1.0.0
gh release create v1.0.0 --title "v1.0.0" --notes "$(awk '/^## \[1.0.0\]/{flag=1; next} /^## \[/{if(flag) exit} flag' docs/CHANGELOG.md)"
```

The [Publish NPM](../.github/workflows/publish-npm.yml) workflow builds with pnpm, then publishes each package with `npm publish --access public --provenance` (OIDC trusted publishing). Already-published versions are skipped.

By contributing, you agree that your contribution may be distributed under the MIT license.
