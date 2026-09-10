# Contributing to Pywel

Pywel accepts small, reviewed Git changes to a portable, unofficial Crimson Desert knowledge standard. Canonical JSON is under `data/canonical/`; `dist/` is generated. Read [SOURCE_POLICY](docs/SOURCE_POLICY.md) and [DATA_RIGHTS](DATA_RIGHTS.md) first.

## One supported change

1. Read existing entities, claims, evidence, and relevant schemas before adding a duplicate.
2. Use a branch and pull request. Explain the correction or concrete requirement, affected record IDs, sources, and expected result. First ask what can be removed when proposing architecture changes.
3. Supply atomic assertions with patch, platform, locale, spoiler level, confidence, and public-safe provenance. Distinguish publisher statements, historical reports, and observations; preserve contradictions and limits.
4. Record source URL, title/publisher, revision or source context when available, capture date, rights basis, and attribution. Normalizing wording does not resolve unknown source rights.
5. Run `npm ci`, `npm run validate`, and `npm run repository:policy`. Run relevant tests for affected behavior; software/schema changes also require `npm run typecheck` and `npm test`. Report actual results and any existing failed gate.
6. Obtain maintainer review of the diff and evidence. Acceptance is a reviewed canonical commit. Issues, votes, receipts, tool responses, and generated files do not automatically promote truth.

The first release has a finite retained manifest. Expanding it requires an explicit scope decision and the same rights/privacy checks. The historical content queue is not a release obligation.

## Contributor rights

Intentional code, schema, and project-documentation submissions are offered under Apache-2.0. Original canonical data and database selection/arrangement are offered under CC BY-SA 4.0 as scoped in [LICENSE-DATA](LICENSE-DATA). You must hold authority to grant these rights. Identify third-party material and its license; never claim ownership of publisher IP.

For compatible community sources, retain title, creator/contributor attribution, source/history locator, license link, prior modification notices, and an explanation of Pywel's changes. No noncommercial condition is attached to Pywel's CC license; the separate publisher-IP boundary in DATA_RIGHTS still applies.

Do not submit personal gameplay state, private research, conversations, prompts, account identifiers, credentials, private paths, screenshots, saves, assets, source mirrors, copied prose, leaks, or game-extraction output. Do not fetch personal-system data to complete a Pywel contribution.

## Reports

Use repository issues for safe factual, attribution, and rights reports. Follow the contact-request procedure in [SECURITY](SECURITY.md) for sensitive reports; keep report details out of public issues until a private route is agreed. Never post credentials or private evidence publicly. Maintainers follow SOURCE_POLICY's correction/removal procedure.

No live service or account is required to prepare a local change. Publishing, deployment, paid resources, and contacting third parties are separate actions requiring appropriate authorization.
