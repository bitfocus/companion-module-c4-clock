import type ModuleInstance from './main.js'
import { freezeLastSlideState, waitingForMediaClick } from './main.js'

export type FeedbacksSchema = {
	auto_load_state: { type: 'boolean'; options: { state: string } }
	freeze_state: { type: 'boolean'; options: { source: number; state: string } }
	c4_offline: { type: 'boolean'; options: Record<string, never> }
	ends_overdue: { type: 'boolean'; options: Record<string, never> }
	running: { type: 'boolean'; options: Record<string, never> }
	overdue: { type: 'boolean'; options: Record<string, never> }
	time_threshold: { type: 'boolean'; options: { level: string } }
	output_mode: { type: 'boolean'; options: { mode: string } }
	ppt_source: { type: 'boolean'; options: { source: number } }
	flash_active: { type: 'boolean'; options: Record<string, never> }
	arm_active: { type: 'boolean'; options: Record<string, never> }
	can_navigate: { type: 'boolean'; options: { direction: string } }
	session_state: { type: 'boolean'; options: { state: string } }
	pace_state: { type: 'boolean'; options: { state: string } }
	media_active: { type: 'boolean'; options: Record<string, never> }
	media_next: { type: 'boolean'; options: Record<string, never> }
}

const WHITE = 0xffffff
const BRIGHT_GREEN = 0x40ff40
const BLACK = 0x000000
const RED = 0xe02020
const AMBER = 0xff9d00

export function UpdateFeedbacks(self: ModuleInstance): void {
	self.setFeedbackDefinitions({
		auto_load_state: {
			name: 'Auto load PowerPoint state',
			type: 'boolean',
			defaultStyle: { bgcolor: BRIGHT_GREEN, color: BLACK },
			options: [
				{
					id: 'state',
					type: 'dropdown',
					label: 'State',
					default: 'on',
					choices: ['on', 'off', 'pending', 'unavailable'].map((id) => ({ id, label: id.toUpperCase() })),
				},
			],
			callback: (event) => self.autoLoadStatus().toLowerCase() === event.options.state,
		},
		freeze_state: {
			name: 'Freeze last slide state',
			type: 'boolean',
			defaultStyle: { bgcolor: BRIGHT_GREEN, color: BLACK },
			options: [
				{
					id: 'source',
					type: 'dropdown',
					label: 'PowerPoint source',
					default: 0,
					choices: [
						{ id: 0, label: 'Selected PowerPoint source' },
						...[1, 2, 3, 4].map((id) => ({ id, label: `PPT ${id}` })),
					],
				},
				{
					id: 'state',
					type: 'dropdown',
					label: 'State',
					default: 'on',
					choices: ['on', 'off', 'pending', 'unavailable'].map((id) => ({ id, label: id.toUpperCase() })),
				},
			],
			callback: (event) => {
				const freeze = freezeLastSlideState(self.state, Number(event.options.source))
				const state =
					!self.connected || !freeze.available
						? 'unavailable'
						: freeze.pending
							? 'pending'
							: freeze.enabled
								? 'on'
								: 'off'
				return state === event.options.state
			},
		},
		ends_overdue: {
			name: 'Ends at display shows OVER BY',
			type: 'boolean',
			options: [],
			defaultStyle: { color: RED },
			callback: () => self.state.isOverdue === true || /over\s*by/i.test(self.state.endTimeLabel || ''),
		},
		c4_offline: {
			name: 'C4 app offline',
			type: 'boolean',
			options: [],
			defaultStyle: { text: 'C4\nOFFLINE', bgcolor: 0x303438, color: 0xaeb4b8, size: 12, png64: '' },
			callback: () => self.connected !== true,
		},
		running: {
			name: 'Countdown is running',
			type: 'boolean',
			defaultStyle: { bgcolor: BRIGHT_GREEN, color: BLACK },
			options: [],
			callback: () => self.state.isRunning === true,
		},
		overdue: {
			name: 'Countdown is overdue',
			type: 'boolean',
			defaultStyle: { bgcolor: RED, color: 0xffffff },
			options: [],
			callback: () => self.state.isOverdue === true,
		},
		time_threshold: {
			name: 'Countdown has reached a fixed warning threshold (legacy)',
			type: 'boolean',
			defaultStyle: {},
			options: [
				{
					id: 'level',
					type: 'dropdown',
					label: 'Threshold',
					default: 'five',
					choices: [
						{ id: 'five', label: 'Fixed 5 minutes' },
						{ id: 'one', label: 'Fixed 1 minute' },
					],
				},
			],
			callback: (feedback) => {
				const remaining = Number(self.state.remainingSeconds)
				if (!Number.isFinite(remaining)) return false
				return feedback.options.level === 'one' ? remaining >= 0 && remaining <= 60 : remaining > 60 && remaining <= 300
			},
		},
		output_mode: {
			name: 'Output mode is active',
			type: 'boolean',
			defaultStyle: { bgcolor: 0xffffff, color: BLACK },
			options: [
				{
					id: 'mode',
					type: 'dropdown',
					label: 'Output',
					default: 'timer',
					choices: [
						{ id: 'timer', label: 'Countdown' },
						{ id: 'clock', label: 'Time of day' },
						{ id: 'notes', label: 'Notes' },
						{ id: 'black', label: 'Black' },
						{ id: 'off', label: 'Output off' },
					],
				},
			],
			callback: (feedback) => normalizeOutputMode(self.state.outputMode) === normalizeOutputMode(feedback.options.mode),
		},
		ppt_source: {
			name: 'PowerPoint source is active',
			type: 'boolean',
			defaultStyle: { bgcolor: BRIGHT_GREEN, color: BLACK },
			options: [
				{
					id: 'source',
					type: 'dropdown',
					label: 'Source',
					default: 1,
					choices: [
						{ id: 1, label: 'PPT 1' },
						{ id: 2, label: 'PPT 2' },
						{ id: 3, label: 'PPT 3' },
						{ id: 4, label: 'PPT 4' },
					],
				},
			],
			callback: (feedback) => self.state.activePpt === Number(feedback.options.source),
		},
		flash_active: {
			name: 'Flash time is active',
			type: 'boolean',
			defaultStyle: { bgcolor: AMBER, color: BLACK },
			options: [],
			callback: () => self.state.flashTimeActive === true,
		},
		arm_active: {
			name: 'Arm / Auto Arm is active',
			type: 'boolean',
			defaultStyle: { bgcolor: RED, color: WHITE },
			options: [],
			callback: () => self.state.autoStartArmed === true,
		},
		can_navigate: {
			name: 'Presenter navigation is available',
			type: 'boolean',
			defaultStyle: {},
			options: [
				{
					id: 'direction',
					type: 'dropdown',
					label: 'Direction',
					default: 'next',
					choices: [
						{ id: 'previous', label: 'Previous' },
						{ id: 'next', label: 'Next' },
					],
				},
			],
			callback: (feedback) =>
				feedback.options.direction === 'previous'
					? self.state.canPreviousPresenter === true
					: self.state.canNextPresenter === true,
		},
		session_state: {
			name: 'Session timing state',
			type: 'boolean',
			defaultStyle: {},
			options: [
				{
					id: 'state',
					type: 'dropdown',
					label: 'State',
					default: 'behind',
					choices: [
						{ id: 'behind', label: 'Behind / over' },
						{ id: 'ahead', label: 'Ahead / under' },
						{ id: 'on-time', label: 'On time' },
					],
				},
			],
			callback: (feedback) => sessionState(self.state.sessionDeltaClass) === feedback.options.state,
		},
		pace_state: {
			name: 'Slide pace state',
			type: 'boolean',
			defaultStyle: {},
			options: [
				{
					id: 'state',
					type: 'dropdown',
					label: 'State',
					default: 'behind',
					choices: [
						{ id: 'behind', label: 'Behind' },
						{ id: 'ahead', label: 'Ahead' },
						{ id: 'ontrack', label: 'On track' },
					],
				},
			],
			callback: (feedback) => paceState(self.state) === feedback.options.state,
		},
		media_active: {
			name: 'Media is playing or paused',
			type: 'boolean',
			defaultStyle: { bgcolor: AMBER, color: BLACK },
			options: [],
			callback: () => ['playing', 'paused'].includes((self.state.mediaState || '').toLowerCase()),
		},
		media_next: {
			name: 'Next PowerPoint slide contains audio or video',
			type: 'boolean',
			defaultStyle: { bgcolor: AMBER, color: BLACK },
			options: [],
			callback: () => {
				const kind = (self.state.nextSlideMediaKind || '').trim().toLowerCase()
				return waitingForMediaClick(self.state) || kind.includes('video') || kind.includes('audio') || kind === 'media'
			},
		},
	})
}

function normalizeOutputMode(value?: string): string {
	switch (
		(value || '')
			.trim()
			.toLowerCase()
			.replace(/[^a-z]/g, '')
	) {
		case 'clock':
		case 'time':
		case 'timeofday':
			return 'clock'
		case 'notes':
			return 'notes'
		case 'black':
		case 'blackout':
			return 'black'
		case 'off':
		case 'outputoff':
			return 'off'
		case 'countdown':
		case 'timer':
		default:
			return 'timer'
	}
}

function paceState(state: ModuleInstance['state']): string {
	const severity = (state.paceSeverity || '').toLowerCase()
	if (severity.includes('behind')) return 'behind'
	if (severity.includes('ahead')) return 'ahead'
	if (severity.includes('ontrack')) return 'ontrack'

	const text = (state.paceText || '').toUpperCase()
	if (text.includes('BEHIND')) return 'behind'
	if (text.includes('AHEAD')) return 'ahead'
	if (text.includes('ON TRACK')) return 'ontrack'
	return ''
}

function sessionState(value?: string): string {
	const state = (value || '').toLowerCase().replace(/[^a-z]/g, '')
	if (state.includes('behind') || state.includes('over')) return 'behind'
	if (state.includes('ahead') || state.includes('under')) return 'ahead'
	if (state.includes('ontime')) return 'on-time'
	return ''
}
