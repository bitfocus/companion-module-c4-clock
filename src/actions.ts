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
}

export function UpdateActions(self: ModuleInstance): void {
	self.setActionDefinitions({
		start: { name: 'Start countdown', options: [], callback: async () => self.sendControl({ action: 'start' }) },
		pause: { name: 'Pause countdown', options: [], callback: async () => self.sendControl({ action: 'pause' }) },
		toggle: {
			name: 'Play / Pause countdown',
			options: [],
			callback: async () => self.sendControl({ action: 'toggle' }),
		},
		reset: { name: 'Reset countdown', options: [], callback: async () => self.sendControl({ action: 'reset' }) },
		presenter_previous: {
			name: 'Previous presenter',
			options: [],
			callback: async () => self.sendControl({ action: 'previous-presenter' }),
		},
		presenter_next: {
			name: 'Next presenter',
			options: [],
			callback: async () => self.sendControl({ action: 'next-presenter' }),
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
			callback: async (event) => {
				const seconds = self.quickPresetSeconds(Number(event.options.index))
				await self.sendControl({ action: 'set-duration', seconds })
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
			callback: async (event) => self.sendControl({ action: 'output', mode: String(event.options.mode) }),
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
			callback: async (event) => self.sendControl({ action: 'ppt', source: Number(event.options.source) }),
		},
		flash_time: {
			name: 'Toggle flash time',
			options: [],
			callback: async () => self.sendControl({ action: 'flash' }),
		},
		arm: {
			name: 'Toggle Arm / Auto Arm',
			options: [],
			callback: async () => self.sendControl({ action: 'arm' }),
		},
		jog: {
			name: 'Add or subtract countdown time',
			options: [{ id: 'seconds', type: 'number', label: 'Seconds', default: 60, min: -3600, max: 3600 }],
			callback: async (event) => self.sendControl({ action: 'jog', seconds: Number(event.options.seconds) }),
		},
	})
}
