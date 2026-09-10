# Security policy

The supported reference source version is **1.0.0**, identified by the public `v1.0.0` tag and [release notes](https://github.com/RolandSaint/pywel/releases/tag/v1.0.0). Its certified source baseline and review limits are recorded in [M5_COMPLETION](docs/M5_COMPLETION.md). Earlier private milestone checkpoints are recovery references, not supported public releases. This is a local, read-only reference implementation; no production service or response-time guarantee is supplied.

Do not open a public issue containing vulnerability details, credentials, personal data, private save data, or rights-sensitive source copies.

To request a private reporting route, open an issue in the repository distributing this source with the title **Private contact requested** and only a request for a private contact method. Include no technical or sensitive details. A maintainer must arrange a private channel before you share the report. This is a contact-request procedure; the issue itself is not a private reporting channel. An already established trusted private channel can also be used.

Once a private route is agreed, provide the affected source version and build ID, endpoint or artifact, safe reproduction steps, and impact. Use synthetic examples; real credentials and personal data are not needed. Retain only the minimum local incident information while awaiting contact. Maintainers assess the report, correct affected source through reviewed Git changes, and rerun the relevant checks before distributing a replacement.

See [THREAT_MODEL](docs/THREAT_MODEL.md) for the supported security boundary and [SOURCE_POLICY](docs/SOURCE_POLICY.md) for attribution and correction/removal procedures.
