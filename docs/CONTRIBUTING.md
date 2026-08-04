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

### First release (bootstrap)

npm Trusted Publishing cannot create a brand-new package. Publish `0.1.0` once with a local token, then enable OIDC.

```bash
pnpm install
pnpm build
pnpm test
node ./scripts/prepare-npm-publish.mjs
node ./scripts/publish-packages.mjs   # requires npm login / token; no --provenance
git checkout -- packages/*/package.json
```

On npmjs.com, open each package → Settings → Trusted Publisher → GitHub Actions:

- Repository: `twilic/ai`
- Workflow: `publish-npm.yml`
- Packages: `@twilic/ai`, `@twilic/ai-openai`, `@twilic/ai-sdk`, `@twilic/ai-agents`

Then create the GitHub release/tag. The workflow skips versions that are already on npm, so the bootstrap tag is safe.

```bash
git tag v0.1.0
git push origin v0.1.0
gh release create v0.1.0 --title "v0.1.0" --notes-file docs/CHANGELOG.md
```

### Later releases (OIDC)

1. Bump versions in `packages/{core,openai,ai-sdk,agents}/package.json`.
2. Update `docs/CHANGELOG.md`.
3. Commit, push to `main`, then tag:

```bash
git tag v0.1.1
git push origin v0.1.1
gh release create v0.1.1 --generate-notes
```

The [Publish NPM](../.github/workflows/publish-npm.yml) workflow builds with pnpm, then publishes each package with `npm publish --access public --provenance` (OIDC trusted publishing). Already-published versions are skipped.

By contributing, you agree that your contribution may be distributed under the MIT license.
