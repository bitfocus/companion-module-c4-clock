import { createHash } from 'node:crypto'
import type { CompanionPresetDefinitions, SomeButtonGraphicsElement } from '@companion-module/base'
import type { ModuleSchema } from './main.js'

export type AudioStatus = {
	feedStale?: boolean
	receivers?: Array<{
		ip: string
		state?: string
		channels?: Array<{
			number: number
			name?: string
			label?: string
			state?: string
			transmitter?: string
			percent?: number | null
			bars?: number | null
			rfDbm?: number | null
			severity?: string
		}>
	}>
}

export type RadioDisplay = {
	id: string
	label: string
	identity: string
	value: string
	colour: number
	segments: number
	rf: number | null
	speakerName?: string
}

type MicrophoneAssignment = { receiverIp: string; channel: number }
export type RadioRunSheet = {
	presenters?: Array<{
		active?: boolean
		next?: boolean
		finished?: boolean
		presenterName?: string
		title?: string
		microphones?: MicrophoneAssignment[]
		panelists?: Array<{ name?: string; microphones?: MicrophoneAssignment[] }>
	}>
}

function assignedSpeakers(runSheet?: RadioRunSheet): Map<string, string> {
	const assignments = new Map<string, string>()
	const rows = [...(runSheet?.presenters || [])].filter((row) => !row.finished || row.active || row.next)
	rows.sort((a, b) => (a.active ? 0 : a.next ? 1 : 2) - (b.active ? 0 : b.next ? 1 : 2))
	for (const row of rows) {
		const people = [{ name: row.presenterName || row.title, microphones: row.microphones }, ...(row.panelists || [])]
		for (const person of people) {
			if (!person.name?.trim()) continue
			for (const microphone of person.microphones || []) {
				const identity = `${microphone.receiverIp}|${microphone.channel}`
				if (!assignments.has(identity)) assignments.set(identity, person.name.trim())
			}
		}
	}
	return assignments
}

export function unavailableRadio(radio: RadioDisplay): RadioDisplay {
	return { ...radio, value: 'OFFLINE', colour: 0x73787c, segments: 0, rf: null }
}

function valid(value: unknown, min: number, max: number): value is number {
	return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}

export function projectRadios(status: AudioStatus, runSheet?: RadioRunSheet): RadioDisplay[] {
	const radios: RadioDisplay[] = []
	const speakers = assignedSpeakers(runSheet)
	for (const receiver of status.receivers || []) {
		if (!receiver.ip || receiver.state === 'disabled') continue
		for (const channel of receiver.channels || []) {
			if (!Number.isInteger(channel.number) || channel.number < 1 || radios.length >= 256) continue
			const identity = `${receiver.ip}|${channel.number}`
			const label =
				(channel.label && channel.label !== 'SIMULATED' ? channel.label : channel.name) || `CH ${channel.number}`
			const connected =
				!status.feedStale &&
				receiver.state === 'online' &&
				channel.state === 'online' &&
				channel.transmitter === 'connected'
			const percent = valid(channel.percent, 0, 100) ? channel.percent : null
			const bars = valid(channel.bars, 0, 5) && Number.isInteger(channel.bars) ? channel.bars : null
			const rf = valid(channel.rfDbm, -120, 0) ? channel.rfDbm : null
			let radio: RadioDisplay = {
				id: createHash('sha256').update(identity).digest('hex').slice(0, 16),
				speakerName: speakers.get(identity),
				label,
				identity,
				value: percent !== null ? `${percent}%` : bars !== null ? `${bars}/5 BARS` : 'UNKNOWN',
				colour: channel.severity === 'critical' ? 0xe02020 : channel.severity === 'warning' ? 0xff9d00 : 0x40ff40,
				segments: percent !== null ? Math.ceil(percent / 20) : (bars ?? 0),
				rf: rf === null ? null : rf >= -65 ? 4 : rf >= -80 ? 3 : rf >= -90 ? 2 : rf >= -100 ? 1 : 0,
			}
			if (!connected) radio = unavailableRadio(radio)
			radios.push(radio)
		}
	}
	return radios
}

export function radioVariables(
	radios: Iterable<RadioDisplay>,
	micLabels?: ReadonlySet<string>,
): Record<`radio_${string}`, string | number> {
	const values: Record<`radio_${string}`, string | number> = {}
	for (const radio of radios) {
		const prefix = `radio_${radio.id}` as const
		const label = (micLabels?.has(radio.id) ? radio.label : radio.speakerName || radio.label).toUpperCase()
		values[`${prefix}_label`] = label.length > 9 ? label.slice(0, 6) + '...' : label
		values[`${prefix}_battery`] = radio.value
		values[`${prefix}_colour`] = radio.colour
		values[`${prefix}_rf_label`] = radio.rf === null && radio.value !== 'OFFLINE' ? 'RF?' : 'RF'
		for (let i = 1; i <= 5; i++) values[`${prefix}_cell_${i}`] = i <= radio.segments ? radio.colour : 0x252a29
		for (let i = 1; i <= 4; i++) values[`${prefix}_rf_${i}`] = radio.rf !== null && i <= radio.rf ? 0x40ff40 : 0x252a29
	}
	return values
}

export function radioPreset(
	radio: RadioDisplay,
	label: string,
): NonNullable<CompanionPresetDefinitions<ModuleSchema>[string]> {
	const variable = (suffix: string) => `$(${label}:radio_${radio.id}_${suffix})`
	const expression = (suffix: string) => ({ value: variable(suffix), isExpression: true as const })
	const elements: SomeButtonGraphicsElement[] = [
		{
			id: 'box0',
			type: 'box',
			x: 0,
			y: 0,
			width: 100,
			height: 100,
			color: 0x050607,
			borderWidth: 4,
			borderColor: expression('colour'),
			cornerRadius: 8,
		},
		{
			id: 'text0',
			type: 'text',
			text: variable('label'),
			x: 8,
			y: 10,
			width: 84,
			height: 24,
			fontsize: 65,
			fontsizeAllowShrink: true,
			weight: 'bold',
			color: 0xffffff,
			halign: 'center',
			valign: 'center',
		},
		{
			id: 'battery',
			type: 'box',
			x: 10,
			y: 41,
			width: 64,
			height: 29,
			color: 0x050607,
			borderWidth: 2,
			borderColor: expression('colour'),
		},
		{ id: 'batteryCap', type: 'box', x: 74, y: 49, width: 4, height: 12, color: expression('colour') },
		{
			id: 'batteryValue',
			type: 'text',
			text: variable('battery'),
			x: 7,
			y: 73,
			width: 73,
			height: 21,
			fontsize: 80,
			fontsizeAllowShrink: true,
			weight: 'bold',
			color: expression('colour'),
			halign: 'center',
			valign: 'center',
		},
		{
			id: 'rfLabel',
			type: 'text',
			text: variable('rf_label'),
			x: 80,
			y: 74,
			width: 17,
			height: 16,
			fontsize: 70,
			fontsizeAllowShrink: true,
			color: 0xaaaaaa,
			halign: 'center',
			valign: 'center',
		},
	]
	for (let i = 1; i <= 5; i++)
		elements.push({
			id: `cell${i}`,
			type: 'box',
			x: 14 + (i - 1) * 11,
			y: 45,
			width: 9,
			height: 21,
			color: expression(`cell_${i}`),
		})
	for (let i = 1; i <= 4; i++)
		elements.push({
			id: `rf${i}`,
			type: 'box',
			x: 85,
			y: 65 - (i - 1) * 9,
			width: 7,
			height: 6,
			color: expression(`rf_${i}`),
		})
	return {
		type: 'layered',
		name: `${radio.label} battery + RF (${radio.identity})`,
		canvas: { decoration: undefined },
		elements,
		steps: [
			{
				down: [{ actionId: 'radio_label', options: { id: radio.id, mode: 'mic' } }],
				up: [{ actionId: 'radio_label', options: { id: radio.id, mode: 'speaker' } }],
			},
		],
		feedbacks: [],
	}
}

export function radioDemoPresets(): CompanionPresetDefinitions<ModuleSchema> {
	const presets: CompanionPresetDefinitions<ModuleSchema> = {}
	const examples: RadioDisplay[] = [
		{
			id: 'demo_percent',
			label: 'DEMO HH1',
			identity: 'preview only',
			value: '85%',
			colour: 0x40ff40,
			segments: 5,
			rf: 4,
		},
		{
			id: 'demo_bars',
			label: 'DEMO HH2',
			identity: 'preview only',
			value: '2/5 BARS',
			colour: 0xff9d00,
			segments: 2,
			rf: 3,
		},
		{ id: 'demo_low', label: 'DEMO HH3', identity: 'preview only', value: '5%', colour: 0xe02020, segments: 1, rf: 2 },
		{
			id: 'demo_offline',
			label: 'DEMO HH4',
			identity: 'preview only',
			value: 'OFFLINE',
			colour: 0x73787c,
			segments: 0,
			rf: null,
		},
	]
	for (const radio of examples) {
		const preset = radioPreset(radio, 'Preview')
		if (preset.type !== 'layered') continue
		const values = radioVariables([radio])
		for (const element of preset.elements) {
			for (const [property, value] of Object.entries(element)) {
				const reference =
					typeof value === 'string'
						? value
						: value && typeof value === 'object' && 'isExpression' in value && value.isExpression
							? value.value
							: null
				if (typeof reference !== 'string' || !reference.startsWith('$(Preview:')) continue
				const literalValue = values[reference.slice(10, -1) as keyof typeof values]
				if (literalValue !== undefined) Object.assign(element, { [property]: literalValue })
			}
		}
		preset.name = `${radio.label}: example only, not a live receiver`
		preset.steps = []
		presets[`radio_${radio.id}`] = preset
	}
	return presets
}
