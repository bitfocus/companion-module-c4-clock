# C4 Clock

Bitfocus Companion connection for [C4 Clock](https://c4clock.com/), from Intense Imagery.
Controls countdowns and run-sheet cues, and displays live timer, session,
PowerPoint and media status through C4's built-in HTTP API.

See [setup and controls](./companion/HELP.md), [release procedure](./RELEASING.md)
and [MIT licence](./LICENSE).

## Requirements

- Companion 5.0 or newer, supporting module API 2.1 and layered presets.
- C4 Clock with Web Display enabled; Web Control and the relevant C4 entitlement
  are required to send commands. C4 Clock 5.77.183 is the release-test baseline.
- A reachable Clock PC on a trusted network. No OSC setup is required.

## Development

Use Node.js 22.20 or newer within the Node 22 line, and Corepack/Yarn 4:

```sh
corepack enable
yarn install --immutable
yarn verify
yarn package
```

The standard Companion tools build and validate the distributable package.
CI builds, lints and runs tests; the Bitfocus module-checks workflow is retained.
Nothing is published merely by building the module locally.

Button layers are rebuilt from `design-assets/preset-layout.json`. This file
contains visual layouts and feedback definitions only, not saved connection
settings or a user's Companion page export. Image assets are embedded in presets.

The official module ID is `c4-clock`. `cc-conference-clock` is retained as a
legacy ID for earlier privately installed builds. Existing action, feedback
and variable IDs are unchanged.
