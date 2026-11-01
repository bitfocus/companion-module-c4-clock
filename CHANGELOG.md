# Changelog

## 1.0.1 - Review Fixes And Expanded Presets

- Match the API 2.1 template's Node 26 runtime, types and TypeScript settings.
- Clear compiled output before building, and run CI tests in a separate job.
- Respect Companion action cancellation without reporting a connection failure.
- Refresh preset variable references after renaming the connection.
- Preserve existing action, feedback and variable IDs.
- Add native-shape radio battery/RF presets following C4's severity and RF scale,
  with reported percent or bars, stale/offline handling and stable receiver IDs.
- Show DEMO examples before receivers are configured. Assigned speaker names
  replace mic labels; hold a mic button to show its label and release to restore.
- Add LOAD PREV/NEXT wording, +/-5 minute presets, CLEAR MESSAGE and larger
  abbreviated Current/Next presenter displays.
- Match active greens, black Time Left frame, red armed state and improved
  text contrast; show WAITING / CLICK TO / PLAY from C4's media state/banner.
- Add optional Freeze last slide and AUTO LOAD PPT controls with confirmed-state
  feedback and availability guards. These require the matching C4 HTTP support,
  currently local test code; public .193 shows them unavailable. Other controls,
  radio monitoring and demo previews remain usable without those new endpoints.
- Consolidate local test builds 1.0.1-1.0.22 into this official 1.0.1 update.
  Replace previously placed presets to adopt changed layouts or press/release actions.

## 1.0.0 - First official release

- Start the official Bitfocus release series at 1.0.0, carrying forward all
  functionality and fixes from the development builds below.
- Include timer and run-sheet controls, four PowerPoint sources, output controls,
  live status presets, C4 warning colours and the corrected slides-left counter.
- Retain existing action, feedback and variable IDs and the private legacy module
  ID. The earlier version numbers were development builds, not store releases.

## Development History (Not Official Store Releases)

## 1.0.68 - Slides-left mode correction

- Use the full deck's slides-left count unless C4 Single Deck mode is enabled.
  A PowerPoint section's count no longer overrides normal deck navigation.
- Keep the dedicated section-slides-left variable and existing button bindings.
- Test slide progression, section boundaries, mode changes and source changes.

## 1.0.67 - Live C4 timer colours

- The countdown preset now follows C4's configured warning thresholds. With C4
  5.77.183+, Stream Deck stays green/amber/red even if presenter output is white
  or flashing. Older builds fall back to their reported output colour.
- Keep contrasting text and outlines on the timer's coloured background.
- Retain the explicit fixed 5/1-minute feedbacks for custom/legacy buttons.
  Replace previously placed timer tiles with the new preset once to opt in.

## 1.0.66 - Prepared for initial Bitfocus submission

- Adopt the approved `bitfocus/companion-module-c4-clock` repository and
  `c4-clock` module ID, retaining the private `cc-conference-clock` legacy ID.
- Bring across the tested 1.0.65 timer, run-sheet, four-source PowerPoint,
  output, media, session, offline feedback and layered preset implementation.
- Keep existing action, feedback and variable IDs.
- Use the standard Companion packaging/validation tools and Node 22 runtime.
- Include setup, compatibility, trusted-network guidance and release steps.
- Replace the saved test-page export with layout-only design data.
- Add automated action, HTTP, lifecycle and release-metadata checks alongside
  the existing preset/feedback/offline checks.
