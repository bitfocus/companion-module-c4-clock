import type ModuleInstance from './main.js'

export type ActionsSchema = {
	start: { options: Record<string, never> }
	pause: { options: Record<string, never> }
	toggle: { options: Record<string, never> }
	reset: { options: Record<string, never> }
	presenter_previous: { options: Record<string, never> }
	presenter_next: { options: Record<string, never> }
	quick_preset: { options: { index: number } }
	output: { options: { mode: string } }
	ppt_source: { options: { source: number } }
	flash_time: { options: Record<string, never> }
	arm: { options: Record<string, never> }
	jog: { options: { seconds: number } }
	freeze_last_slide: { options: { source: number; mode: string } }
	auto_load_ppt: { options: { mode: string } }
	clear_message: { options: Record<string, never> }
	radio_label_toggle: { options: { id: string } }
	radio_label: { options: { id: string; mode: string } }
}

export function UpdateActions(self: ModuleInstance): void {
	self.setActionDefinitions({
		radio_label: {
			name: 'Radio display: show speaker name or mic label',
			options: [
				{ id: 'id', type: 'textinput', label: 'Radio ID (set by the microphone preset)', default: '' },
				{
					id: 'mode',
					type: 'dropdown',
					label: 'Heading',
					default: 'speaker',
					choices: [
						{ id: 'speaker', label: 'Speaker name' },
						{ id: 'mic', label: 'Mic label' },
					],
				},
			],
			callback: async (event, context) => {
				if (!context.signal.aborted && ['speaker', 'mic'].includes(String(event.options.mode)))
					self.setRadioLabel(String(event.options.id), event.options.mode === 'mic')
			},
		},
		radio_label_toggle: {
			name: 'Radio display: toggle speaker name / mic label',
			options: [{ id: 'id', type: 'textinput', label: 'Radio ID (set by the microphone preset)', default: '' }],
			callback: async (event, context) => {
				if (!context.signal.aborted) self.toggleRadioLabel(String(event.options.id))
			},
		},
		auto_load_ppt: {
			name: 'Auto load PowerPoint',
			options: [
				{
					id: 'mode',
					type: 'dropdown',
					label: 'Auto load',
					default: 'toggle',
					choices: [
						{ id: 'toggle', label: 'Toggle' },
						{ id: 'on', label: 'On' },
						{ id: 'off', label: 'Off' },
					],
				},
			],
			callback: async (event, context) => self.sendAutoLoadPpt(String(event.options.mode), context.signal),
		},
		clear_message: {
			name: 'Clear presenter message',
			options: [],
			callback: async (_event, context) => self.sendControl({ action: 'clear-message' }, context.signal),
		},
		freeze_last_slide: {
			name: 'Freeze last slide',
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
					id: 'mode',
					type: 'dropdown',
					label: 'Freeze',
					default: 'toggle',
					choices: [
						{ id: 'toggle', label: 'Toggle' },
						{ id: 'on', label: 'On' },
						{ id: 'off', label: 'Off' },
					],
				},
			],
			callback: async (event, context) =>
				self.sendFreezeLastSlide(Number(event.options.source), String(event.options.mode), context.signal),
		},
		start: {
			name: 'Start countdown',
			options: [],
			callback: async (_event, context) => self.sendControl({ action: 'start' }, context.signal),
		},
		pause: {
			name: 'Pause countdown',
			options: [],
			callback: async (_event, context) => self.sendControl({ action: 'pause' }, context.signal),
		},
		toggle: {
			name: 'Play / Pause countdown',
			options: [],
			callback: async (_event, context) => self.sendControl({ action: 'toggle' }, context.signal),
		},
		reset: {
			name: 'Reset countdown',
			options: [],
			callback: async (_event, context) => self.sendControl({ action: 'reset' }, context.signal),
		},
		presenter_previous: {
			name: 'Previous presenter',
			options: [],
			callback: async (_event, context) => self.sendControl({ action: 'previous-presenter' }, context.signal),
		},
		presenter_next: {
			name: 'Next presenter',
			options: [],
			callback: async (_event, context) => self.sendControl({ action: 'next-presenter' }, context.signal),
		},
		quick_preset: {
			name: 'Set quick preset immediately',
			options: [
				{
					id: 'index',
					type: 'dropdown',
					label: 'Preset',
					default: 1,
					choices: [1, 2, 3, 4, 5, 6].map((index) => ({ id: index, label: `Quick preset ${index}` })),
				},
			],
			callback: async (event, context) => {
				const seconds = self.quickPresetSeconds(Number(event.options.index))
				await self.sendControl({ action: 'set-duration', seconds }, context.signal)
			},
		},
		output: {
			name: 'Select output',
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
			callback: async (event, context) =>
				self.sendControl({ action: 'output', mode: String(event.options.mode) }, context.signal),
		},
		ppt_source: {
			name: 'Select PowerPoint source',
			options: [
				{
					id: 'source',
					type: 'dropdown',
					label: 'PowerPoint source',
					default: 1,
					choices: [
						{ id: 1, label: 'PPT 1' },
						{ id: 2, label: 'PPT 2' },
						{ id: 3, label: 'PPT 3' },
						{ id: 4, label: 'PPT 4' },
					],
				},
			],
			callback: async (event, context) =>
				self.sendControl({ action: 'ppt', source: Number(event.options.source) }, context.signal),
		},
		flash_time: {
			name: 'Toggle flash time',
			options: [],
			callback: async (_event, context) => self.sendControl({ action: 'flash' }, context.signal),
		},
		arm: {
			name: 'Toggle Arm / Auto Arm',
			options: [],
			callback: async (_event, context) => self.sendControl({ action: 'arm' }, context.signal),
		},
		jog: {
			name: 'Add or subtract countdown time',
			options: [{ id: 'seconds', type: 'number', label: 'Seconds', default: 60, min: -3600, max: 3600 }],
			callback: async (event, context) =>
				self.sendControl({ action: 'jog', seconds: Number(event.options.seconds) }, context.signal),
		},
	})
}
