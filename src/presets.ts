import type { CompanionPresetDefinitions, CompanionPresetSection } from '@companion-module/base'
import type { ModuleSchema } from './main.js'
import type ModuleInstance from './main.js'
import { LAYERED_PRESET_LAYOUTS, type LayeredPresetLayout } from './layered-presets.generated.js'
import { OUTPUT_ICONS } from './output-icons.js'
import { radioPreset, radioDemoPresets } from './radios.js'

const GREEN = 0x4bb824
const BRIGHT_GREEN = 0x40ff40
const BLACK = 0x050607
const WHITE = 0xffffff
const RED = 0xe02020

function style(text: string, size: number | 'auto' | '14' | '18' | '24' = 'auto') {
	const companionSize = size === 24 ? ('18' as const) : size
	return {
		text,
		size: companionSize,
		color: WHITE,
		bgcolor: BLACK,
		alignment: 'center:center' as const,
		png64: OUTPUT_ICONS.buttonBorder,
		pngalignment: 'center:center' as const,
		show_topbar: false,
	}
}

function outputStyle(text: string) {
	return {
		text,
		size: '14' as const,
		color: WHITE,
		bgcolor: 0x26282a,
		alignment: 'center:center' as const,
		png64: OUTPUT_ICONS.buttonBorder,
		pngalignment: 'center:center' as const,
		show_topbar: false,
	}
}

function statusValueStyle(text: string) {
	return {
		text,
		size: '18' as const,
		color: WHITE,
		bgcolor: BLACK,
		alignment: 'center:center' as const,
		png64: OUTPUT_ICONS.buttonBorder,
		pngalignment: 'center:center' as const,
		show_topbar: false,
	}
}

function slidesLeftValueStyle() {
	return statusValueStyle('SLIDES\nLEFT\n$(C4_Clock:slides_left)')
}

export function UpdatePresets(self: ModuleInstance): void {
	const radioGroup = {
		id: 'radio_readings',
		name: 'Radio mic batteries and RF',
		type: 'simple' as const,
		presets: [] as string[],
	}
	const structure: CompanionPresetSection[] = [
		{
			id: 'clock_control',
			name: 'C4 Clock Control',
			definitions: [
				{
					id: 'transport',
					name: 'Presenter and timer',
					type: 'simple',
					presets: [
						'previous',
						'five_minutes_minus',
						'minute_minus',
						'play_pause',
						'minute_plus',
						'five_minutes_plus',
						'next',
						'reset',
						'auto_load_ppt',
						'clear_message',
						'current_presenter',
						'next_presenter',
					],
				},
				{
					id: 'quick_presets',
					name: 'Quick presets',
					type: 'simple',
					presets: ['quick_1', 'quick_2', 'quick_3', 'quick_4', 'quick_5', 'quick_6'],
				},
				{
					id: 'outputs',
					name: 'Outputs',
					type: 'simple',
					presets: ['output_timer', 'output_clock', 'output_notes', 'output_black', 'output_off'],
				},
				{
					id: 'powerpoint',
					name: 'PowerPoint and slides',
					type: 'simple',
					presets: ['ppt_1', 'ppt_2', 'ppt_3', 'ppt_4', 'freeze_last_slide', 'slides_left', 'current_slide'],
				},
				{
					id: 'timing',
					name: 'Session timing',
					type: 'simple',
					presets: ['timer', 'session_delta', 'ends_at', 'pace', 'pace_eta', 'flash_time', 'arm'],
				},
				{ id: 'media', name: 'Media', type: 'simple', presets: ['media_remaining', 'video_next'] },
				radioGroup,
			],
		},
	]

	const presets: CompanionPresetDefinitions<ModuleSchema> = {
		auto_load_ppt: {
			type: 'simple',
			name: 'Auto load PowerPoint',
			style: { ...style('AUTO\nLOAD PPT', '14'), bgcolor: 0x303438 },
			steps: [{ down: [{ actionId: 'auto_load_ppt', options: { mode: 'toggle' } }], up: [] }],
			feedbacks: [
				{ feedbackId: 'auto_load_state', options: { state: 'on' }, style: { bgcolor: BRIGHT_GREEN, color: BLACK } },
				{ feedbackId: 'auto_load_state', options: { state: 'pending' }, style: { bgcolor: 0xff9d00, color: BLACK } },
				{
					feedbackId: 'auto_load_state',
					options: { state: 'unavailable' },
					style: { bgcolor: 0x303438, color: 0xaeb4b8 },
				},
			],
		},
		clear_message: {
			type: 'simple',
			name: 'Clear presenter message',
			style: style('CLEAR\nMESSAGE', '14'),
			steps: [{ down: [{ actionId: 'clear_message', options: {} }], up: [] }],
			feedbacks: [],
		},
		current_presenter: {
			type: 'simple',
			name: 'Current presenter display',
			style: style('CURRENT\n$(C4_Clock:current_presenter)', '14'),
			steps: [],
			feedbacks: [],
		},
		next_presenter: {
			type: 'simple',
			name: 'Next presenter display',
			style: style('NEXT\n$(C4_Clock:next_presenter)', '14'),
			steps: [],
			feedbacks: [],
		},
		freeze_last_slide: {
			type: 'simple',
			name: 'Freeze last slide (selected PowerPoint)',
			style: style('FREEZE\nLAST\nSLIDE', '14'),
			steps: [{ down: [{ actionId: 'freeze_last_slide', options: { source: 0, mode: 'toggle' } }], up: [] }],
			feedbacks: [
				{
					feedbackId: 'freeze_state',
					options: { source: 0, state: 'on' },
					style: { bgcolor: BRIGHT_GREEN, color: BLACK },
				},
				{
					feedbackId: 'freeze_state',
					options: { source: 0, state: 'pending' },
					style: { bgcolor: 0xff9d00, color: BLACK },
				},
				{
					feedbackId: 'freeze_state',
					options: { source: 0, state: 'unavailable' },
					style: { bgcolor: 0x303438, color: 0xaeb4b8 },
				},
			],
		},
		previous: {
			type: 'simple',
			name: 'Load previous presenter',
			style: style('LOAD\nPREV', '18'),
			steps: [{ down: [{ actionId: 'presenter_previous', options: {} }], up: [] }],
			feedbacks: [],
		},
		minute_minus: {
			type: 'simple',
			name: 'Subtract one minute',
			style: style('−1\nMIN', '18'),
			steps: [{ down: [{ actionId: 'jog', options: { seconds: -60 } }], up: [] }],
			feedbacks: [],
		},
		five_minutes_minus: {
			type: 'simple',
			name: 'Subtract five minutes',
			style: style('−5\nMIN', '18'),
			steps: [{ down: [{ actionId: 'jog', options: { seconds: -300 } }], up: [] }],
			feedbacks: [],
		},
		five_minutes_plus: {
			type: 'simple',
			name: 'Add five minutes',
			style: style('+5\nMIN', '18'),
			steps: [{ down: [{ actionId: 'jog', options: { seconds: 300 } }], up: [] }],
			feedbacks: [],
		},
		play_pause: {
			type: 'simple',
			name: 'Play / Pause',
			style: style('▶', '24'),
			steps: [{ down: [{ actionId: 'toggle', options: {} }], up: [] }],
			feedbacks: [
				{
					feedbackId: 'running',
					options: {},
					style: { bgcolor: BRIGHT_GREEN, color: BLACK, png64: OUTPUT_ICONS.pauseActive },
				},
			],
		},
		minute_plus: {
			type: 'simple',
			name: 'Add one minute',
			style: style('+1\nMIN', '18'),
			steps: [{ down: [{ actionId: 'jog', options: { seconds: 60 } }], up: [] }],
			feedbacks: [],
		},
		next: {
			type: 'simple',
			name: 'Load next presenter',
			style: style('LOAD\nNEXT', '18'),
			steps: [{ down: [{ actionId: 'presenter_next', options: {} }], up: [] }],
			feedbacks: [],
		},
		reset: {
			type: 'simple',
			name: 'Reset countdown',
			style: style('RESET', 28),
			steps: [{ down: [{ actionId: 'reset', options: {} }], up: [] }],
			feedbacks: [],
		},
		output_timer: outputPreset('Countdown output', 'timer', 'COUNT\nDOWN'),
		output_clock: outputPreset('Time output', 'clock', 'TIME'),
		output_notes: outputPreset('Notes output', 'notes', 'NOTES'),
		output_black: outputPreset('Black output', 'black', 'BLACK'),
		output_off: outputPreset('Output off', 'off', 'OUTPUT\nOFF'),
		ppt_1: pptPreset('PowerPoint 1', '$(C4_Clock:ppt1_label)', 1),
		ppt_2: pptPreset('PowerPoint 2', '$(C4_Clock:ppt2_label)', 2),
		ppt_3: pptPreset('PowerPoint 3', '$(C4_Clock:ppt3_label)', 3),
		ppt_4: pptPreset('PowerPoint 4', '$(C4_Clock:ppt4_label)', 4),
		slides_left: { type: 'simple', name: 'Slides left', style: slidesLeftValueStyle(), steps: [], feedbacks: [] },
		current_slide: {
			type: 'simple',
			name: 'Current slide',
			style: statusValueStyle('SLIDES\n$(C4_Clock:slide)'),
			steps: [],
			feedbacks: [],
		},
		timer: {
			type: 'simple',
			name: 'Countdown display',
			style: statusValueStyle('TIME LEFT\n$(C4_Clock:timer)'),
			steps: [],
			feedbacks: [],
		},
		session_delta: {
			type: 'simple',
			name: 'Session over / under',
			style: statusValueStyle('SESSION\n$(C4_Clock:session_delta)'),
			steps: [],
			feedbacks: [
				{
					feedbackId: 'session_state',
					options: { state: 'behind' },
					style: { bgcolor: BLACK, color: RED, png64: OUTPUT_ICONS.buttonBorder },
				},
				{
					feedbackId: 'session_state',
					options: { state: 'ahead' },
					style: { bgcolor: BLACK, color: GREEN, png64: OUTPUT_ICONS.buttonBorder },
				},
				{
					feedbackId: 'session_state',
					options: { state: 'on-time' },
					style: { bgcolor: BLACK, color: WHITE, png64: OUTPUT_ICONS.buttonBorder },
				},
			],
		},
		ends_at: {
			type: 'simple',
			name: 'Countdown ends at / over by',
			style: style('$(C4_Clock:ends_label)\n$(C4_Clock:ends_at)', '14'),
			steps: [],
			feedbacks: [{ feedbackId: 'ends_overdue', options: {}, style: { color: RED } }],
		},
		pace: pacePreset('Slide pace', 'PACE\n$(C4_Clock:pace)'),
		pace_eta: pacePreset('Slide pace ETA', 'ETA\n$(C4_Clock:pace_eta)'),
		flash_time: {
			type: 'simple',
			name: 'Flash time',
			style: style('FLASH', 24),
			steps: [{ down: [{ actionId: 'flash_time', options: {} }], up: [] }],
			feedbacks: [{ feedbackId: 'flash_active', options: {}, style: { bgcolor: 0xff9d00, color: BLACK } }],
		},
		arm: {
			type: 'simple',
			name: 'Arm / Auto Arm',
			style: style('$(C4_Clock:arm_label)\n$(C4_Clock:arm_state)', 24),
			steps: [{ down: [{ actionId: 'arm', options: {} }], up: [] }],
			feedbacks: [
				{
					feedbackId: 'arm_active',
					options: {},
					style: { bgcolor: RED, color: WHITE, png64: OUTPUT_ICONS.buttonBorderBlack },
				},
			],
		},
		media_remaining: {
			type: 'simple',
			name: 'Media remaining',
			style: statusValueStyle('MEDIA\n$(C4_Clock:media_remaining)'),
			steps: [],
			feedbacks: [
				{
					feedbackId: 'media_active',
					options: {},
					style: { bgcolor: 0xff9d00, color: BLACK, png64: OUTPUT_ICONS.buttonBorderBlack },
				},
			],
		},
		video_next: {
			type: 'simple',
			name: 'Audio / video next indicator',
			style: style('$(C4_Clock:next_media_warning)', 24),
			steps: [],
			feedbacks: [
				{
					feedbackId: 'media_next',
					options: {},
					style: { bgcolor: 0xff9d00, color: BLACK, png64: OUTPUT_ICONS.buttonBorderBlack },
				},
			],
		},
	}

	for (let index = 1; index <= 6; index++) {
		presets[`quick_${index}`] = {
			type: 'simple',
			name: `Quick preset ${index}`,
			style: style(`$(C4_Clock:preset_${index}_label)`, 28),
			steps: [{ down: [{ actionId: 'quick_preset', options: { index } }], up: [] }],
			feedbacks: [],
		}
	}

	const freezeLayout = structuredClone(LAYERED_PRESET_LAYOUTS.ppt_1)
	freezeLayout.feedbacks = []
	for (const element of freezeLayout.elements) {
		if ('type' in element && element.type === 'box') element.color = 0x303438
		if ('type' in element && element.type === 'image')
			element.base64Image = `data:image/png;base64,${OUTPUT_ICONS.buttonBorderBlack}`
		if ('type' in element && element.type === 'text')
			Object.assign(element, {
				text: 'FREEZE\nLAST\nSLIDE',
				x: 6,
				y: 8,
				width: 88,
				height: 84,
				fontsize: 20,
				fontsizeAllowShrink: true,
				color: WHITE,
				outlineColor: WHITE,
			})
	}
	const layouts: Record<string, LayeredPresetLayout> = {
		...LAYERED_PRESET_LAYOUTS,
		arm: { ...LAYERED_PRESET_LAYOUTS.reset, feedbacks: [] },
		freeze_last_slide: freezeLayout,
		five_minutes_minus: LAYERED_PRESET_LAYOUTS.minute_minus,
		five_minutes_plus: LAYERED_PRESET_LAYOUTS.minute_plus,
		auto_load_ppt: freezeLayout,
		clear_message: LAYERED_PRESET_LAYOUTS.reset,
		current_presenter: { ...LAYERED_PRESET_LAYOUTS.ppt_1, feedbacks: [] },
		next_presenter: { ...LAYERED_PRESET_LAYOUTS.ppt_1, feedbacks: [] },
	}
	const sessionLayout = structuredClone(layouts.session_delta)
	const sessionAhead = sessionLayout.feedbacks.find(
		(feedback) => feedback.feedbackId === 'session_state' && feedback.options.state === 'ahead',
	)
	if (sessionAhead) {
		for (const property of ['color', 'outlineColor']) {
			sessionAhead.styleOverrides.push({ elementId: 'text0', elementProperty: property, override: literal(0x000000) })
		}
	}
	layouts.session_delta = sessionLayout
	for (const [id, layout] of Object.entries(layouts)) {
		const sourcePreset = presets[id]
		if (!sourcePreset || sourcePreset.type !== 'simple') {
			throw new Error(`Layered preset source is missing: ${id}`)
		}

		const elements = structuredClone(layout.elements)
		if (id === 'video_next') {
			const text = elements.find((element) => 'type' in element && element.type === 'text')
			if (text) Object.assign(text, { fontsize: 20, fontsizeAllowShrink: true })
		}
		if (id === 'arm') {
			const text = elements.find((element) => 'type' in element && element.type === 'text')
			if (text)
				Object.assign(text, {
					text: '$(C4_Clock:arm_label)\n$(C4_Clock:arm_state)',
					fontsize: 24,
					fontsizeAllowShrink: true,
				})
		}
		if (id === 'auto_load_ppt' || id === 'clear_message') {
			const text = elements.find((element) => 'type' in element && element.type === 'text')
			if (text)
				Object.assign(text, {
					text: id === 'auto_load_ppt' ? 'AUTO\nLOAD\nPPT' : 'CLEAR\nMESSAGE',
					fontsize: id === 'clear_message' ? 20 : 24,
					fontsizeAllowShrink: true,
					x: 6,
					y: 8,
					width: 88,
					height: 84,
				})
		}
		if (id === 'current_presenter' || id === 'next_presenter') {
			const name = elements.find((element) => 'type' in element && element.type === 'text')
			if (name) {
				Object.assign(name, {
					text: `$(C4_Clock:${id}_display)`,
					fontsize: 42,
					fontsizeAllowShrink: true,
					x: 8,
					y: 38,
					width: 84,
					height: 50,
				})
				elements.push({
					...structuredClone(name),
					id: 'presenterHeader',
					text: id === 'current_presenter' ? 'CURRENT' : 'NEXT',
					fontsize: 48,
					fontsizeAllowShrink: false,
					x: 8,
					y: 9,
					width: 84,
					height: 26,
					color: GREEN,
					outlineColor: GREEN,
				})
			}
		}
		if (id === 'five_minutes_minus' || id === 'five_minutes_plus') {
			const text = elements.find((element) => 'type' in element && element.type === 'text')
			if (text) text.text = id === 'five_minutes_minus' ? '−5\nMIN' : '+5\nMIN'
		}
		if (id === 'timer') {
			const colour = { value: `$(${self.label || 'C4_Clock'}:timer_colour)`, isExpression: true as const }
			const textColour = { value: `$(${self.label || 'C4_Clock'}:timer_text_colour)`, isExpression: true as const }
			for (const element of elements) {
				if ('type' in element && element.type === 'box') element.color = colour
				if ('type' in element && element.type === 'image')
					element.base64Image = `data:image/png;base64,${OUTPUT_ICONS.buttonBorderBlack}`
				if ('type' in element && element.type === 'text') {
					element.color = textColour
					if (Object.hasOwn(element, 'outlineColor')) element.outlineColor = textColour
				}
			}
		}
		if (id === 'previous' || id === 'next') {
			const image = elements.find((element) => 'type' in element && element.type === 'image')
			const text = elements.find((element) => 'type' in element && element.type === 'text')
			if (image) image.base64Image = `data:image/png;base64,${OUTPUT_ICONS.buttonBorder}`
			if (text)
				Object.assign(text, {
					text: id === 'previous' ? 'LOAD\nPREV' : 'LOAD\nNEXT',
					enabled: true,
					x: 0,
					y: 0,
					width: 100,
					height: 100,
					fontsize: 25,
					fontsizeAllowShrink: true,
					color: WHITE,
					outlineColor: WHITE,
					halign: 'center',
					valign: 'center',
				})
		}
		if (id === 'output_timer') {
			const border = elements.find((element) => 'type' in element && element.type === 'image')
			const reference = LAYERED_PRESET_LAYOUTS.output_clock.elements.find(
				(element) => 'type' in element && element.type === 'image',
			)
			if (border && reference) border.base64Image = reference.base64Image
		}
		presets[id] = {
			type: 'layered',
			name: sourcePreset.name,
			canvas: layout.canvas,
			elements,
			steps: sourcePreset.steps,
			feedbacks:
				id === 'timer'
					? []
					: layout.feedbacks.length > 0
						? [
								...structuredClone(layout.feedbacks),
								...convertSimpleFeedbacks(
									layout,
									(sourcePreset.feedbacks as SimpleFeedbackForLayerConversion[]).filter(
										(feedback) => !layout.feedbacks.some((existing) => existing.feedbackId === feedback.feedbackId),
									),
								),
							]
						: convertSimpleFeedbacks(layout, sourcePreset.feedbacks as SimpleFeedbackForLayerConversion[]),
		}
	}

	const radios = [...(self.radios?.values() ?? [])]
	radioGroup.presets = radios.length ? radios.map((radio) => `radio_${radio.id}`) : ['radio_setup']
	if (radios.length) {
		for (const radio of radios) presets[`radio_${radio.id}`] = radioPreset(radio, self.label || 'C4_Clock')
	} else {
		const examples = radioDemoPresets()
		Object.assign(presets, examples)
		radioGroup.name = 'Radio mic batteries and RF - DEMO examples (not live)'
		radioGroup.presets = [...Object.keys(examples), 'radio_setup']
		presets.radio_setup = {
			type: 'simple',
			name: 'Radio setup status - enable C4 Pro and configure Audio Setup',
			style: { ...style('$(C4_Clock:radio_status)', '14'), bgcolor: 0x303438 },
			steps: [],
			feedbacks: [],
		}
	}
	for (const [id, preset] of Object.entries(presets)) {
		if (!preset) continue
		if (id.startsWith('radio_demo_')) continue
		if (preset.type === 'simple') {
			preset.style.text = preset.style.text?.replaceAll('$(C4_Clock:', `$(${self.label || 'C4_Clock'}:`)
			preset.feedbacks.push({
				feedbackId: 'c4_offline',
				options: {},
				style: {
					text: 'C4\nOFFLINE',
					bgcolor: 0x303438,
					color: 0xaeb4b8,
					size: 12,
					png64: '',
				},
			})
		} else if (preset.type === 'layered') {
			const background = preset.elements.find((element) => 'type' in element && element.type === 'box')!
			const text = preset.elements.find((element) => 'type' in element && element.type === 'text')!
			for (const element of preset.elements) {
				if ('type' in element && element.type === 'text' && typeof element.text === 'string')
					element.text = element.text.replaceAll('$(C4_Clock:', `$(${self.label || 'C4_Clock'}:`)
			}
			const originalIds = preset.elements
				.map((element) => element.id)
				.filter((id): id is string => typeof id === 'string')
			preset.elements = [
				...preset.elements,
				{
					...background,
					id: 'c4OfflineBackground',
					enabled: false,
					x: 0,
					y: 0,
					width: 100,
					height: 100,
					rotation: 0,
					opacity: 100,
					color: 0x303438,
				},
				{
					...text,
					id: 'c4OfflineText',
					enabled: false,
					x: 0,
					y: 0,
					width: 100,
					height: 100,
					rotation: 0,
					opacity: 100,
					text: 'C4\nOFFLINE',
					fontsize: 16.7,
					fontsizeAllowShrink: true,
					color: 0xaeb4b8,
					outlineColor: 0xaeb4b8,
					halign: 'center',
					valign: 'center',
				},
			]
			preset.feedbacks.push({
				feedbackId: 'c4_offline',
				options: {},
				isInverted: false,
				styleOverrides: [...originalIds, 'c4OfflineBackground', 'c4OfflineText'].map((elementId) => ({
					elementId,
					elementProperty: 'enabled',
					override: literal(elementId.startsWith('c4Offline')),
				})),
			})
		}
	}
	self.setPresetDefinitions(structure, presets)
}

type SimpleFeedbackForLayerConversion = {
	feedbackId: string
	options: Record<string, string | number | boolean | undefined>
	isInverted?: boolean
	style: {
		text?: string
		color?: number
		bgcolor?: number
		png64?: string
	}
}

function convertSimpleFeedbacks(
	layout: LayeredPresetLayout,
	feedbacks: SimpleFeedbackForLayerConversion[],
): LayeredPresetLayout['feedbacks'] {
	const elements = layout.elements as unknown as Array<{ id: string; type: string; outlineColor?: unknown }>
	const background = elements.find((element) => element.type === 'box')
	const image = elements.find((element) => element.type === 'image')
	const textElements = elements.filter((element) => element.type === 'text')

	return feedbacks.map((feedback) => {
		const styleOverrides: Array<{
			elementId: string
			elementProperty: string
			override: { value: string | number | boolean; isExpression: false }
		}> = []
		if (background && feedback.style.bgcolor !== undefined) {
			styleOverrides.push({
				elementId: background.id,
				elementProperty: 'color',
				override: literal(feedback.style.bgcolor),
			})
		}
		if (feedback.style.color !== undefined) {
			for (const element of textElements) {
				styleOverrides.push({
					elementId: element.id,
					elementProperty: 'color',
					override: literal(feedback.style.color),
				})
				if (Object.hasOwn(element, 'outlineColor')) {
					styleOverrides.push({
						elementId: element.id,
						elementProperty: 'outlineColor',
						override: literal(feedback.style.color),
					})
				}
			}
		}
		if (image && feedback.style.png64) {
			const base64Image = feedback.style.png64.startsWith('data:')
				? feedback.style.png64
				: `data:image/png;base64,${feedback.style.png64}`
			styleOverrides.push({ elementId: image.id, elementProperty: 'base64Image', override: literal(base64Image) })
		}
		if (feedback.style.text !== undefined && textElements.length > 0) {
			styleOverrides.push({
				elementId: textElements[0].id,
				elementProperty: 'text',
				override: literal(feedback.style.text),
			})
			if (image) styleOverrides.push({ elementId: image.id, elementProperty: 'enabled', override: literal(false) })
		}

		return {
			feedbackId: feedback.feedbackId,
			options: feedback.options,
			isInverted: feedback.isInverted === true,
			styleOverrides,
		}
	}) as LayeredPresetLayout['feedbacks']
}

function literal<T extends string | number | boolean>(value: T): { value: T; isExpression: false } {
	return { value, isExpression: false }
}

function outputPreset(
	name: string,
	mode: string,
	text: string,
): NonNullable<CompanionPresetDefinitions<ModuleSchema>[string]> {
	return {
		type: 'simple',
		name,
		style: outputStyle(text),
		steps: [{ down: [{ actionId: 'output', options: { mode } }], up: [] }],
		feedbacks: [
			{
				feedbackId: 'output_mode',
				options: { mode },
				style: { bgcolor: WHITE, color: BLACK, png64: OUTPUT_ICONS.buttonBorderBlack },
			},
		],
	}
}

function pptPreset(
	name: string,
	label: string,
	source: number,
): NonNullable<CompanionPresetDefinitions<ModuleSchema>[string]> {
	return {
		type: 'simple',
		name,
		style: style(label, 24),
		steps: [{ down: [{ actionId: 'ppt_source', options: { source } }], up: [] }],
		feedbacks: [
			{
				feedbackId: 'ppt_source',
				options: { source },
				style: { bgcolor: BRIGHT_GREEN, color: BLACK, png64: OUTPUT_ICONS.buttonBorderBlack },
			},
		],
	}
}

function pacePreset(name: string, text: string): NonNullable<CompanionPresetDefinitions<ModuleSchema>[string]> {
	return {
		type: 'simple',
		name,
		style: style(text, 24),
		steps: [],
		feedbacks: [
			{
				feedbackId: 'pace_state',
				options: { state: 'behind' },
				style: { bgcolor: RED, color: WHITE, png64: OUTPUT_ICONS.buttonBorderBlack },
			},
			{ feedbackId: 'pace_state', options: { state: 'ahead' }, style: { bgcolor: GREEN, color: BLACK } },
			{ feedbackId: 'pace_state', options: { state: 'ontrack' }, style: { bgcolor: BLACK, color: WHITE } },
		],
	}
}
