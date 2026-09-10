# Threat model

Pywel protects canonical integrity, public-source privacy and rights, reproducible artifacts, and the reliability of local read responses. The supported runtime is a read-only loopback REST server or stdio MCP process loading a validated public projection of local canonical JSON. It does not ingest submissions, fetch sources, execute contributed code, call models, or provision services.

| Threat | Boundary and control | Remaining limit |
| --- | --- | --- |
| Unsupported or poisoned facts | Reviewed atomic Git changes, specific evidence and rights context, validation, explicit uncertainty, and predicate/context tests. | Schemas and passing tests cannot establish factual truth or source independence. |
| Source prompt injection | Evidence/source text is untrusted data; runtime performs no source fetching or source-directed action. | A consuming agent must preserve this boundary when reading a response or following a locator. |
| Private material or secrets | Fixed source manifest, repository policy, source/artifact checks, safe public receipts, and scoped review. | Pattern scans are incomplete. Original private Git history is excluded, not certified clean. |
| Artifact substitution or corruption | Exact relative-path inventory, SHA-256 checksums, source/build identity, and clean reproduction. | An unsigned hash is an integrity check, not proof of who supplied it. Obtain source and hashes through a trusted channel. |
| Dependency compromise | Locked installation, pinned runtime and CI actions, retained-dependency audit, and small dependency surface. | Audit databases do not detect every vulnerability or malicious package. |
| Local request abuse | Loopback binding, read-only endpoints, bounded input and result sizes, and no remote evidence fetches. | Loopback is not authentication; software and users on the machine share that trust boundary. |
| Rights overcollection | Source policy, minimal normalized facts, precise locators, attribution, and reviewed removal. | Remote terms and content can change; a public URL does not establish permission. |
| False freshness or relevance | Unknown patches, validity/review boundaries, unknown/partial answers, and predicate-specific support. | The dataset is finite historical coverage, not a live-game freshness guarantee. |

The implementation keeps no query telemetry or user profiles. Do not add request logging that records user queries as an incidental debugging feature. Never place sensitive data in an issue or pull request; use [SECURITY](../SECURITY.md).

Public hosting would create an additional trust boundary and is outside the supported installation. Binding a development process to the internet, adding authentication, or building rate-limit infrastructure is not part of this milestone.

For a credible privacy, rights, or integrity report, stop distributing the affected material, correct the canonical source and unsupported dependents, rerun the affected checks, and create a newly identified artifact. See [SOURCE_POLICY](SOURCE_POLICY.md). A deletion in the current tree does not remove historical copies.
