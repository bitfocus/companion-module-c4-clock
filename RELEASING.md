# Releasing C4 Clock

Follow the [Bitfocus module release process](https://companion.free/for-developers/module-development/module-lifecycle/releasing-your-module/).
Repository creation/approval does not itself publish a module in the store.

## Before submission

1. Use Node 22 and the Yarn version pinned in `package.json`.
2. Run `yarn install --immutable`, `yarn verify` and `yarn package`.
3. Import the package into a test Companion instance. Check actions, layered
   presets, custom connection labels, source selection, offline recovery and
   navigation locks against C4 Clock. Never send test commands to a live show.
4. Review the diff for private addresses, configuration exports, credentials,
   generated archives or unrelated files. Keep runtime/build output out of Git.
5. Ensure the package and manifest versions agree and update `CHANGELOG.md`.
6. Confirm customers can obtain the C4 version needed for any promised features.
   A local-only C4 installer is not a public release.

## Submit a version

1. Push the reviewed source to the approved Bitfocus repository and let CI pass.
2. Create and push a version tag matching the package version, e.g. `v1.0.68`.
   A GitHub release triggers the retained release-package workflow, but does not
   replace submission through the Developer Portal.
3. In the [Bitfocus Developer Portal](https://developer.bitfocus.io/), open
   **My Connections > C4 Clock > Submit Version**, select that tag and submit.
   Choose prerelease only when intentionally submitting a test release.
4. Wait for review. Address requested changes in a new commit/version as needed.
   Only claim store availability after the version has been approved.

The previous private series reached 1.0.65; the current proposed official
version is 1.0.68, following local test packages 1.0.66 and 1.0.67. The old module ID is retained in `legacyIds`; action,
feedback and variable IDs must remain stable unless an upgrade script is added.
