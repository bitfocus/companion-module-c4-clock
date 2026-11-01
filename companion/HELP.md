# C4 Clock

Connect Companion to C4 Clock's built-in HTTP control API. No OSC or separate
PowerPoint connection from Companion is needed.

## Setup

1. On the Clock PC, open C4 Clock Settings and enable Web Display and Web Control.
   Web Control requires the relevant C4 Pro permission/entitlement.
2. Note the Clock PC's reachable IP address and web port. New C4 setups use
   `44044`; existing installations retain their saved port, which may be `8080`.
3. Add a **C4 Clock** connection in Companion and enter that IP and port.
   Use `127.0.0.1` only when Companion and C4 Clock run on the same PC.
4. Open Presets and drag the supplied controls onto a Companion page.

The **Web Control Port** in Companion must match **C4 Settings > Web Display >
Web port**. If you change C4's port, update the existing Companion connection too
and reopen browser links or scan the updated QR codes. PowerPoint add-in ports
are separate and do not change. Module upgrades preserve saved connection ports.

Use Companion 5.0 or newer with module API 2.1. C4 Clock 5.77.183 is the release
baseline. Older builds may not expose all status fields or the same safety locks.

## Controls and Presets

- Start, Pause, Play/Pause and Reset the countdown.
- LOAD PREV and LOAD NEXT load the previous/next run-sheet presenter. C4 rejects navigation while the clock
  is running or a presentation is loading; pause or stop first. Finished cues
  can be loaded again for rehearsal. Linked decks follow C4's configured load
  and auto-arm settings; these actions do not advance individual PPT slides.
- Load any of the six quick durations configured in C4. This replaces the
  countdown immediately, rather than just selecting a duration field.
- Add/subtract time, with matching presets for one-minute and five-minute adjustments.
- Select Countdown, Time of Day, Notes, Black or Output Off.
- Select any of the four configured PowerPoint sources. Source-button text
  follows the saved C4 source names; available sources depend on the C4 licence.
- Toggle Flash Time and Arm/Auto Arm according to the active C4 mode.
- Toggle AUTO LOAD PPT to choose whether presenter loads also open linked decks.
  This saves the same setting as C4's desktop toggle; it does not load a deck or
  start the timer by itself. Requires the accompanying local C4 API update, Pro,
  separate-deck mode and an approved folder before enabling. Older public C4
  versions show unavailable. On/off actions are also available for custom buttons.
- CLEAR MESSAGE removes the currently displayed presenter message without
  changing the countdown. This uses C4's existing clear-message command.
- Read-only CURRENT and NEXT presenter displays show the names reported by C4.
  Names auto-scale inside fixed text areas; these buttons perform no action.

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
outputs. C4's standard normal green is rendered in the same bright green as the
other active presets, with a black frame. Other reported colours are retained.
The text contrasts with that background. Changes arrive on the normal
500 ms polling cycle. Missing/invalid colour data uses a neutral dark background,
not guessed timing thresholds. Older C4 builds fall back to their output colour;
update C4 to keep Stream Deck warnings coloured while presenter output is white.

After updating from 1.0.66 or earlier, replace an already placed countdown tile
with the new Countdown display preset once. Companion does not rewrite existing
button layouts when a module updates. Explicit fixed 5/1-minute feedbacks remain
available for older/custom buttons that intentionally use those thresholds.

## Connection and Safety

### Freeze last slide

The Freeze last slide preset toggles protection on C4's selected PowerPoint
source. The action can instead target PPT 1-4 explicitly and set On or Off.
Green means PowerPoint confirmed protection; amber is awaiting confirmation.
Off or unavailable is grey and is not shown as protected. Rapid repeat presses while pending
are ignored. The existing presentation loop setting is not changed.

This optional control requires C4's new Freeze HTTP API and a compatible
PowerPoint add-in. The API addition is currently local test code, not part of
public C4 5.77.193. Older C4 builds show UNAVAILABLE and no Freeze command is sent.
Other existing controls continue working. Freeze protects forward keyboard
advances after the final build; backward keys and Escape remain available.
Mouse clicks, timed advances and other controllers are not covered.

### Radio Mic Battery And RF Presets

With C4 Pro audio monitoring enabled, the module reads `/api/audio/status`
once per second. The **Radio mic batteries and RF** preset section appears
when C4 reports configured receiver channels, including its simulated receivers.
Before receivers are configured, the section instead shows static, clearly marked
**DEMO** examples (percent, bars, critical and offline) plus a setup-status tile.
DEMO tiles are previews only, never live or clickable controls. Replace placed
DEMO tiles with the real mic presets once receivers appear; they do not auto-bind.
Drag one preset for each microphone you want to monitor. Each tile remains
bound to that receiver address and channel, not its position in the list.
The mic heading is replaced by its assigned run-sheet speaker's name when present,
abbreviated to fit. The active speaker takes priority when a mic is reused, then
the next speaker, then an upcoming assignment; panelist assignments are supported.
Unassigned mics or unavailable run-sheet data fall back to the normal mic label.
Names refresh from `/api/runsheet` with the radio polling and never alter assignments.
Hold a live mic tile to temporarily show its original mic label; releasing restores
the speaker name. This is a local Companion display choice only; it sends no C4
command and changes no mic assignment. Replace older toggle presets with fresh
presets to get both press and release actions.

The tile uses native shapes: five battery segments and a slim four-segment
RF meter on the right. Battery readings show the reported percentage, or
`2/5 BARS` for bars-only data. Bars are never converted into a percentage;
this is a reported-data format, not an assumption about AA/rechargeable chemistry.
Colours follow C4's severity (green, amber or red), including configured warnings.
RF uses the Audio page's signal scale, not an audio-volume meter. `RF?` with
grey segments means unavailable, not a measured zero signal.

Disconnected, stale, removed or unavailable channels clear their readings and
show grey **OFFLINE**. The tiles cannot control receivers or acknowledge warnings. Audio monitoring being unavailable
(including Free mode or older C4) does not interrupt the existing clock controls.
The new presets need no PowerPoint add-in update. Actual receiver/display testing
is still required before show use.

### Network behaviour

The module polls `/api/state` every 500 ms and sends commands to `/api/control`.
It does not automatically retry commands. Network loss marks the connection
offline and the supplied presets show **C4 OFFLINE**; polling reconnects when C4
becomes reachable. A permission error means controls are disabled in C4, even
when monitoring remains available.

Companion action cancellation aborts a pending HTTP request without reporting
it as a connection failure. This cannot undo a command already received by C4.

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
