import { InstanceBase, InstanceStatus, type SomeCompanionConfigField } from '@companion-module/base'
import { request as httpRequest } from 'node:http'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { UpdateVariableDefinitions, type VariablesSchema } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions, type ActionsSchema } from './actions.js'
import { UpdateFeedbacks, type FeedbacksSchema } from './feedbacks.js'
import { UpdatePresets } from './presets.js'

export type ClockState = {
	timerText?: string
	operatorTimerText?: string
	operatorTimerLabel?: string
	operatorTimerColor?: string
	outputMode?: string
	isRunning?: boolean
	isPaused?: boolean
	isOverdue?: boolean
	remainingSeconds?: number
	color?: string
	label?: string
	slide?: string
	sectionName?: string
	sectionSlidesRemaining?: number
	media?: string
	mediaRemaining?: string
	mediaState?: string
	mediaDuration?: string
	nextSlideMediaKind?: string
	endTime?: string
	endTimeLabel?: string
	paceText?: string
	paceSeverity?: string
	sessionDeltaText?: string
	sessionDeltaClass?: string
	flashTimeActive?: boolean
	autoStartArmed?: boolean
	singleDeckMode?: boolean
	canPreviousPresenter?: boolean
	canNextPresenter?: boolean
	presetsSeconds?: number[]
	activePpt?: number
	ppt1Label?: string
	ppt2Label?: string
	ppt3Label?: string
	ppt4Label?: string
	pptSources?: Array<{ id: number; name?: string; status?: string; connected?: boolean; awaitingFreshData?: boolean }>
}

export type ModuleSchema = {
	config: ModuleConfig
	secrets: undefined
	actions: ActionsSchema
	feedbacks: FeedbacksSchema
	variables: VariablesSchema
}

export { UpgradeScripts }

const DEFAULT_PRESETS = [300, 600, 900, 1800, 2700, 3600]

export default class ModuleInstance extends InstanceBase<ModuleSchema> {
	config!: ModuleConfig
	state: ClockState = {}
	connected = false
	private generation = 0
	private pollTimer?: NodeJS.Timeout
	private polling = false

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: ModuleConfig): Promise<void> {
		this.config = this.normalizedConfig(config)
		this.updateActions()
		this.updateFeedbacks()
		this.updatePresets()
		this.updateVariableDefinitions()
		this.startPolling()
	}

	async destroy(): Promise<void> {
		this.stopPolling()
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		this.config = this.normalizedConfig(config)
		this.startPolling()
	}

	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	async sendControl(payload: Record<string, unknown>): Promise<void> {
		const url = `${this.baseUrl()}/api/control`
		const generation = this.generation
		try {
			const state = await requestJson<ClockState>(url, 'POST', payload)
			if (generation === this.generation) this.applyState(state)
		} catch (error) {
			if (generation !== this.generation) return
			const message = error instanceof Error ? error.message : String(error)
			this.updateStatus(InstanceStatus.ConnectionFailure, message)
			this.log('error', `C4 Clock control failed (${url}): ${message}`)
		}
	}

	quickPresetSeconds(index: number): number {
		const values = this.state.presetsSeconds?.length ? this.state.presetsSeconds : DEFAULT_PRESETS
		return values[Math.max(0, Math.min(5, index - 1))] ?? DEFAULT_PRESETS[index - 1] ?? 300
	}

	updateActions(): void {
		UpdateActions(this)
	}

	updateFeedbacks(): void {
		UpdateFeedbacks(this)
	}

	updatePresets(): void {
		UpdatePresets(this)
	}

	updateVariableDefinitions(): void {
		UpdateVariableDefinitions(this)
	}

	private normalizedConfig(config: ModuleConfig): ModuleConfig {
		return { host: (config.host || '127.0.0.1').trim(), port: Number(config.port) || 8080 }
	}

	private baseUrl(): string {
		return `http://${this.config.host}:${this.config.port}`
	}

	private startPolling(): void {
		this.stopPolling()
		this.markOffline()
		this.updateStatus(InstanceStatus.Connecting)
		void this.pollState()
		this.pollTimer = setInterval(() => void this.pollState(), 500)
	}

	private stopPolling(): void {
		this.generation++
		if (this.pollTimer) clearInterval(this.pollTimer)
		this.pollTimer = undefined
	}

	private async pollState(): Promise<void> {
		if (this.polling) return
		this.polling = true
		const generation = this.generation
		try {
			const state = await requestJson<ClockState>(`${this.baseUrl()}/api/state`, 'GET')
			if (generation === this.generation) this.applyState(state)
		} catch (error) {
			if (generation !== this.generation) return
			const message = error instanceof Error ? error.message : String(error)
			this.updateStatus(InstanceStatus.ConnectionFailure, message)
			this.markOffline()
		} finally {
			this.polling = false
		}
	}

	markOffline(): void {
		this.connected = false
		this.state = {}
		this.setVariableValues({ connection: 'OFFLINE', timer_colour: 0x050607, timer_text_colour: 0xffffff })
		this.checkFeedbacks(
			'c4_offline',
			'ends_overdue',
			'running',
			'overdue',
			'time_threshold',
			'output_mode',
			'ppt_source',
			'flash_active',
			'arm_active',
			'can_navigate',
			'session_state',
			'pace_state',
			'media_active',
			'media_next',
		)
	}

	private applyState(state: ClockState): void {
		this.connected = true
		this.state = state
		const slide = parseSlide(state.slide)
		const sectionLeft = Number.isFinite(state.sectionSlidesRemaining) ? Number(state.sectionSlidesRemaining) : -1
		const deckLeft = slide.total > 0 ? Math.max(0, slide.total - slide.current) : 0
		const presets = state.presetsSeconds?.length ? state.presetsSeconds : DEFAULT_PRESETS
		const activePpt = Number.isInteger(state.activePpt) && Number(state.activePpt) > 0 ? Number(state.activePpt) : 0
		const sourceLabels = new Map(
			(state.pptSources || []).map((source) => [Number(source.id), source.name || `PPT${source.id}`]),
		)
		const ppt1Label = sourceLabels.get(1) || state.ppt1Label || 'PPT1'
		const ppt2Label = sourceLabels.get(2) || state.ppt2Label || 'PPT2'
		const ppt3Label = sourceLabels.get(3) || state.ppt3Label || 'PPT3'
		const ppt4Label = sourceLabels.get(4) || state.ppt4Label || 'PPT4'
		const pace = parsePace(state.paceText)
		const colours = timerColours(state.operatorTimerColor ?? state.color)

		this.setVariableValues({
			connection: 'CONNECTED',
			timer: formatMinutesSeconds(state.operatorTimerText ?? state.timerText),
			timer_colour: colours.background,
			timer_text_colour: colours.foreground,
			timer_label: state.operatorTimerLabel ?? state.label ?? '',
			run_state: state.isRunning ? 'RUNNING' : state.isPaused ? 'PAUSED' : 'READY',
			play_pause: state.isRunning ? 'PAUSE' : 'PLAY',
			output_mode: (state.outputMode || 'timer').toUpperCase(),
			active_ppt: String(activePpt || '-'),
			active_ppt_label: activePpt > 0 ? sourceLabels.get(activePpt) || `PPT${activePpt}` : 'NO PPT',
			ppt1_label: formatPptButtonLabel(ppt1Label),
			ppt2_label: formatPptButtonLabel(ppt2Label),
			ppt3_label: formatPptButtonLabel(ppt3Label),
			ppt4_label: formatPptButtonLabel(ppt4Label),
			slide: slide.current > 0 && slide.total > 0 ? `${slide.current}/${slide.total}` : '--/--',
			current_slide: slide.current > 0 ? String(slide.current) : '--',
			total_slides: slide.total > 0 ? String(slide.total) : '--',
			slides_left: String(state.singleDeckMode === true && sectionLeft >= 0 ? sectionLeft : deckLeft),
			section_name: state.sectionName || '',
			section_slides_left: sectionLeft >= 0 ? String(sectionLeft) : '--',
			session_delta: state.sessionDeltaText || '--',
			ends_label: formatEndsLabel(state),
			ends_at: state.endTime || '--:--',
			pace: pace.status,
			pace_eta: pace.eta,
			flash_state: state.flashTimeActive ? 'ON' : 'OFF',
			arm_label: state.singleDeckMode ? 'AUTO ARM' : 'ARM',
			arm_state: state.autoStartArmed ? 'ON' : 'OFF',
			media_remaining: stripMediaPrefix(state.mediaRemaining || state.media) || '--:--',
			media_state: (state.mediaState || 'IDLE').toUpperCase(),
			media_duration: state.mediaDuration || '--:--',
			next_media_warning: nextMediaWarning(state.nextSlideMediaKind),
			preset_1_label: formatDuration(presets[0] ?? DEFAULT_PRESETS[0]),
			preset_2_label: formatDuration(presets[1] ?? DEFAULT_PRESETS[1]),
			preset_3_label: formatDuration(presets[2] ?? DEFAULT_PRESETS[2]),
			preset_4_label: formatDuration(presets[3] ?? DEFAULT_PRESETS[3]),
			preset_5_label: formatDuration(presets[4] ?? DEFAULT_PRESETS[4]),
			preset_6_label: formatDuration(presets[5] ?? DEFAULT_PRESETS[5]),
		})

		this.updateStatus(InstanceStatus.Ok)
		this.checkFeedbacks(
			'c4_offline',
			'ends_overdue',
			'running',
			'overdue',
			'time_threshold',
			'output_mode',
			'ppt_source',
			'flash_active',
			'arm_active',
			'can_navigate',
			'session_state',
			'pace_state',
			'media_active',
			'media_next',
		)
	}
}

export function formatPptButtonLabel(label: string): string {
	return label.replace(/^PPT\s+(MAIN|BU)$/i, 'PPT\n$1')
}

export function timerColours(colour?: string): { background: number; foreground: number } {
	const value = typeof colour === 'string' ? colour.trim() : ''
	const background = /^#[0-9a-f]{6}$/i.test(value) ? Number.parseInt(value.slice(1), 16) : 0x050607
	const red = (background >> 16) & 0xff
	const green = (background >> 8) & 0xff
	const blue = background & 0xff
	return { background, foreground: red * 299 + green * 587 + blue * 114 >= 128000 ? 0x000000 : 0xffffff }
}

async function requestJson<T>(url: string, method: 'GET' | 'POST', payload?: Record<string, unknown>): Promise<T> {
	return new Promise((resolve, reject) => {
		const body = payload === undefined ? undefined : JSON.stringify(payload)
		const request = httpRequest(
			url,
			{
				method,
				headers:
					body === undefined
						? { accept: 'application/json' }
						: {
								accept: 'application/json',
								'content-type': 'application/json',
								'content-length': Buffer.byteLength(body),
							},
			},
			(response) => {
				const chunks: Buffer[] = []
				response.on('data', (chunk: Buffer | string) =>
					chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
				)
				response.on('end', () => {
					const responseBody = Buffer.concat(chunks).toString('utf8')
					const status = response.statusCode ?? 0
					if (status < 200 || status >= 300) {
						reject(new Error(`HTTP ${status}${responseBody ? `: ${responseBody}` : ''}`))
						return
					}

					try {
						resolve(JSON.parse(responseBody) as T)
					} catch (error) {
						reject(new Error(`Invalid JSON response: ${error instanceof Error ? error.message : String(error)}`))
					}
				})
			},
		)

		request.setTimeout(method === 'POST' ? 2500 : 2000, () => request.destroy(new Error('Request timed out')))
		request.on('error', reject)
		if (body !== undefined) request.write(body)
		request.end()
	})
}

function nextMediaWarning(kind?: string): string {
	switch ((kind || '').trim().toLowerCase()) {
		case 'video':
			return 'VIDEO NEXT'
		case 'audio':
			return 'AUDIO NEXT'
		case 'media':
			return 'MEDIA NEXT'
		default:
			return '-'
	}
}

function stripMediaPrefix(value?: string): string {
	return (value || '').trim().replace(/^media\s+remaining\s*:\s*/i, '')
}

function parseSlide(value?: string): { current: number; total: number } {
	const match = (value || '').match(/(\d+)\s*(?:of|\/)\s*(\d+)/i)
	return match ? { current: Number(match[1]), total: Number(match[2]) } : { current: 0, total: 0 }
}

export function formatEndsLabel(state: Pick<ClockState, 'isOverdue' | 'endTimeLabel'>): string {
	return state.isOverdue === true || /over\s*by/i.test(state.endTimeLabel || '') ? 'OVER BY' : 'ENDS AT'
}

function formatDuration(seconds: number): string {
	if (seconds % 60 === 0) return `${Math.round(seconds / 60)} MIN`
	const minutes = Math.floor(seconds / 60)
	const remainder = Math.max(0, seconds % 60)
	return minutes > 0 ? `${minutes}:${String(remainder).padStart(2, '0')}` : `${seconds} SEC`
}

function formatMinutesSeconds(value?: string): string {
	const text = (value || '').trim()
	const hms = text.match(/^([+-]?)(\d+):(\d{2}):(\d{2})$/)
	if (hms) {
		const minutes = Number(hms[2]) * 60 + Number(hms[3])
		return `${hms[1]}${String(minutes).padStart(2, '0')}:${hms[4]}`
	}

	const ms = text.match(/^([+-]?)(\d+):(\d{2})$/)
	return ms ? `${ms[1]}${String(Number(ms[2])).padStart(2, '0')}:${ms[3]}` : '--:--'
}

function parsePace(value?: string): { status: string; eta: string } {
	const text = (value || '').replace(/^PACE:\s*/i, '').trim()
	if (!text) return { status: '--', eta: '--:--' }

	const parts = text.split(/\s*\|\s*/).filter(Boolean)
	const rawStatus = (parts[0] || '').trim().toUpperCase()
	const status = rawStatus === 'ON TRACK' ? 'TRACK' : rawStatus || '--'
	const etaPart = parts
		.slice(1)
		.join(' | ')
		.match(/ETA\s+(.+)/i)
	return { status, eta: etaPart?.[1]?.trim() || '--:--' }
}
