# C4 Clock

Connect Companion to C4 Clock's built-in HTTP control API. No OSC or separate
PowerPoint connection from Companion is needed.

## Setup

1. On the Clock PC, open C4 Clock Settings and enable Web Display and Web Control.
   Web Control requires the relevant C4 Pro permission/entitlement.
2. Note the Clock PC's reachable IP address and web port, normally `8080`.
3. Add a **C4 Clock** connection in Companion and enter that IP and port.
   Use `127.0.0.1` only when Companion and C4 Clock run on the same PC.
4. Open Presets and drag the supplied controls onto a Companion page.

Use Companion 5.0 or newer with module API 2.1. C4 Clock 5.77.183 is the release
baseline. Older builds may not expose all status fields or the same safety locks.

## Controls and Presets

- Start, Pause, Play/Pause and Reset the countdown.
- Previous and Next run-sheet presenter. C4 rejects navigation while the clock
  is running or a presentation is loading; pause or stop first. Finished cues
  can be loaded again for rehearsal. Linked decks follow C4's configured load
  and auto-arm settings; these actions do not advance individual PPT slides.
- Load any of the six quick durations configured in C4. This replaces the
  countdown immediately, rather than just selecting a duration field.
- Add/subtract time, with presets for one-minute adjustments.
- Select Countdown, Time of Day, Notes, Black or Output Off.
- Select any of the four configured PowerPoint sources. Source-button text
  follows the saved C4 source names; available sources depend on the C4 licence.
- Toggle Flash Time and Arm/Auto Arm according to the active C4 mode.

Status presets and variables include the countdown, run state, current/total
slides, slides left, current section, session under/over, end time, pace/ETA,
media remaining and next-slide media warning.

Slides left follows the full deck normally. In C4 Single Deck mode, it uses the
current section's count when available, otherwise the full deck. The dedicated
section-slides-left variable remains available separately.
The selected C4 source supplies PowerPoint data.
The six quick-preset labels track the durations configured in C4.

The Countdown display preset follows C4's configured warning points, rather than
fixed 5/1-minute warnings. With C4 Clock 5.77.183 or newer, its background always
uses green/amber/red, independently of white-only or flash settings on presenter
outputs. The text contrasts with that background. Changes arrive on the normal
500 ms polling cycle. Missing/invalid colour data uses a neutral dark background,
not guessed timing thresholds. Older C4 builds fall back to their output colour;
update C4 to keep Stream Deck warnings coloured while presenter output is white.

After updating from 1.0.66 or earlier, replace an already placed countdown tile
with the new Countdown display preset once. Companion does not rewrite existing
button layouts when a module updates. Explicit fixed 5/1-minute feedbacks remain
available for older/custom buttons that intentionally use those thresholds.

## Connection and Safety

The module polls `/api/state` every 500 ms and sends commands to `/api/control`.
It does not automatically retry commands. Network loss marks the connection
offline and the supplied presets show **C4 OFFLINE**; polling reconnects when C4
becomes reachable. A permission error means controls are disabled in C4, even
when monitoring remains available.

Use a trusted show LAN. This module uses plain HTTP and does not add login,
encryption or an internet-facing gateway. Do not expose C4's control port to
the internet. Allow only the required show-network access through the firewall.

The module does not edit run-sheet files, mic assignments, licences or receiver
settings. Test the complete show setup, source routing and linked decks before use.

## Earlier Private Builds

The old `cc-conference-clock` module ID is recorded as a legacy ID. Keep a backup
of your Companion configuration before migrating a privately installed version.
Action, feedback and variable IDs have been retained. No saved test-PC connection
settings are included in this module.
