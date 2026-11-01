import assert from 'node:assert/strict'
import { once } from 'node:events'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import test from 'node:test'
import ModuleInstance, { timerColours, freezeLastSlideState } from '../dist/main.js'
import { UpdatePresets } from '../dist/presets.js'
import { UpdateActions } from '../dist/actions.js'
import { UpdateFeedbacks } from '../dist/feedbacks.js'
import { OUTPUT_ICONS } from '../dist/output-icons.js'
import { DEFAULT_WEB_PORT, GetConfigFields } from '../dist/config.js'

test('web port default matches new C4 setups while preserving existing connections', () => {
	assert.equal(DEFAULT_WEB_PORT, 44044)
	assert.equal(GetConfigFields().find((field) => field.id === 'port').default, 44044)
	const self = moduleFixture()
	assert.equal(self.normalizedConfig({ host: 'localhost' }).port, 44044)
	for (const port of [8080, 8044, 12080, 44044]) {
		assert.equal(self.normalizedConfig({ host: 'localhost', port }).port, port)
	}
	assert.match(GetConfigFields().find((field) => field.id === 'web_port_help').value, /update|updating/)
})

function moduleFixture() {
	const self = Object.create(ModuleInstance.prototype)
	Object.assign(self, {
		state: {},
		connected: false,
		polling: false,
		generation: 0,
		values: {},
		statuses: [],
		logs: [],
		setVariableValues(values) {
			Object.assign(this.values, values)
		},
		checkFeedbacks() {},
		log(level, message) {
			this.logs.push({ level, message })
		},
		updateStatus(status, message) {
			this.statuses.push({ status, message })
		},
	})
	return self
}

async function serve(handler, run) {
	const server = createServer(handler)
	server.listen(0, '127.0.0.1')
	await once(server, 'listening')
	try {
		await run({ host: '127.0.0.1', port: server.address().port })
	} finally {
		server.closeAllConnections()
		await new Promise((resolve) => server.close(resolve))
	}
}

test('official identity, legacy ID, runtime and layout-only source', async () => {
	const read = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'))
	const pkg = await read('../package.json')
	const manifest = await read('../companion/manifest.json')
	assert.equal(pkg.name, 'companion-module-c4-clock')
	assert.equal(manifest.id, 'c4-clock')
	assert.equal(manifest.version, pkg.version)
	assert.deepEqual(manifest.legacyIds, ['cc-conference-clock'])
	assert.match(pkg.repository.url, /github\.com\/bitfocus\/companion-module-c4-clock\.git$/)
	assert.equal(manifest.runtime.type, 'node26')
	assert.equal(pkg.engines.node, '^26')
	assert.match(pkg.devDependencies['@types/node'], /^\^26\./)
	assert.equal(pkg.devDependencies.rimraf, '^6.1.3')
	assert.match(pkg.scripts.build, /^rimraf dist && /)
	const tsconfig = await read('../tsconfig.build.json')
	assert.equal(tsconfig.extends, '@companion-module/tools/tsconfig/node26/recommended.json')
	const layout = await read('../design-assets/preset-layout.json')
	assert.deepEqual(Object.keys(layout).sort(), ['imageLibrary', 'page'])
	assert.deepEqual(Object.keys(layout.page), ['controls'])
	assert.doesNotMatch(JSON.stringify(layout), /192\.168\.|"instances"|"moduleId"|"host"|"password"|"token"/)
})

test('timer colours follow C4 instead of local time thresholds, with readable contrast', () => {
	const self = moduleFixture()
	for (const [colour, seconds, expectedBackground, expectedForeground] of [
		['#FFB22B', 900, 0xffb22b, 0x000000],
		['#29D158', 30, 0x40ff40, 0x000000],
		['#FF3030', 480, 0xff3030, 0xffffff],
		['#FFFFFF', -15, 0xffffff, 0x000000],
		['#006699', 600, 0x006699, 0xffffff],
		['#000000', -5, 0x000000, 0xffffff],
	]) {
		self.applyState({ color: colour, remainingSeconds: seconds, isOverdue: seconds < 0 })
		assert.equal(self.values.timer_colour, expectedBackground)
		assert.equal(self.values.timer_text_colour, expectedForeground)
	}
	assert.deepEqual(timerColours('  #aAbBcC  '), { background: 0xaabbcc, foreground: 0x000000 })
	for (const invalid of [undefined, null, '', 'red', '#ff00', '#000000ff', '#zz0000', 1234]) {
		assert.deepEqual(timerColours(invalid), { background: 0x050607, foreground: 0xffffff })
	}
	self.markOffline()
	assert.equal(self.values.timer_colour, 0x050607)
	assert.equal(self.values.timer_text_colour, 0xffffff)
})

test('timer preset binds live colours to the actual connection label without fixed overrides', () => {
	let presets
	UpdatePresets({
		label: 'Stage_Left',
		setPresetDefinitions(_sections, definitions) {
			presets = definitions
		},
	})
	const timer = presets.timer
	assert.equal(timer.type, 'layered')
	assert.equal(
		timer.elements.find((element) => element.type === 'image').base64Image,
		`data:image/png;base64,${OUTPUT_ICONS.buttonBorderBlack}`,
	)
	assert.deepEqual(
		timer.elements.find((element) => element.type === 'box' && element.id !== 'c4OfflineBackground').color,
		{ value: '$(Stage_Left:timer_colour)', isExpression: true },
	)
	for (const element of timer.elements.filter((item) => item.type === 'text' && item.id !== 'c4OfflineText')) {
		assert.deepEqual(element.color, { value: '$(Stage_Left:timer_text_colour)', isExpression: true })
		assert.deepEqual(element.outlineColor, element.color)
	}
	assert.deepEqual(
		timer.feedbacks.map((feedback) => feedback.feedbackId),
		['c4_offline'],
	)
})

test('operator warning colour wins over white-only and flashing presenter colours', () => {
	const self = moduleFixture()
	for (const [operatorTimerColor, color, remainingSeconds, expected] of [
		['#FFB22B', '#FFFFFF', 900, 0xffb22b],
		['#29D158', '#FFFFFF', 30, 0x40ff40],
		['#FF3030', '#FFFFFF', -10, 0xff3030],
		['#FFB22B', '#000000', 120, 0xffb22b],
	]) {
		self.applyState({ operatorTimerColor, color, remainingSeconds })
		assert.equal(self.values.timer_colour, expected)
	}
})

test('all action IDs retain their C4 HTTP command contracts', async () => {
	let definitions
	const sent = []
	const signals = []
	const context = { signal: new AbortController().signal }
	UpdateActions({
		setActionDefinitions(value) {
			definitions = value
		},
		sendControl: async (value, signal) => {
			sent.push(value)
			signals.push(signal)
		},
		quickPresetSeconds: (index) => index * 60,
	})
	const fixed = {
		start: 'start',
		pause: 'pause',
		toggle: 'toggle',
		reset: 'reset',
		presenter_previous: 'previous-presenter',
		presenter_next: 'next-presenter',
		flash_time: 'flash',
		arm: 'arm',
		clear_message: 'clear-message',
	}
	for (const [id, action] of Object.entries(fixed)) {
		await definitions[id].callback({ options: {} }, context)
		assert.deepEqual(sent.pop(), { action })
	}
	await definitions.quick_preset.callback({ options: { index: 4 } }, context)
	assert.deepEqual(sent.pop(), { action: 'set-duration', seconds: 240 })
	await definitions.jog.callback({ options: { seconds: -60 } }, context)
	assert.deepEqual(sent.pop(), { action: 'jog', seconds: -60 })
	for (const mode of ['timer', 'clock', 'notes', 'black', 'off']) {
		await definitions.output.callback({ options: { mode } }, context)
		assert.deepEqual(sent.pop(), { action: 'output', mode })
	}
	for (const source of [1, 2, 3, 4]) {
		await definitions.ppt_source.callback({ options: { source } }, context)
		assert.deepEqual(sent.pop(), { action: 'ppt', source })
	}
	assert.equal(sent.length, 0)
	assert.equal(signals.length, 20)
	assert.ok(signals.every((signal) => signal === context.signal))
})

test('connection rename rebuilds fresh preset text and colour references before polling', async () => {
	const self = moduleFixture()
	Object.defineProperty(self, 'label', { value: 'Old_Clock', writable: true })
	let presets
	self.setPresetDefinitions = (_sections, definitions) => {
		presets = definitions
	}
	self.startPolling = () => {
		assert.ok(JSON.stringify(presets).includes('$(Stage_Clock:timer)'))
	}
	self.updatePresets()
	assert.ok(JSON.stringify(presets).includes('$(Old_Clock:timer)'))
	self.label = 'Stage_Clock'
	await self.configUpdated({ host: 'localhost', port: 8080 })
	const text = JSON.stringify(presets)
	assert.ok(text.includes('$(Stage_Clock:timer_colour)'))
	assert.ok(text.includes('$(Stage_Clock:ppt1_label)'))
	assert.ok(text.includes('$(Stage_Clock:preset_1_label)'))
	assert.ok(!text.includes('Old_Clock:'))
})

test('Freeze preset controls the selected source, with confirmed-state feedback', async () => {
	const self = moduleFixture()
	Object.defineProperty(self, 'label', { value: 'Freeze_Clock' })
	self.connected = true
	self.applyState({ activePpt: 2, freezeLastSlide: { source: 2, available: true, enabled: false, pending: false } })
	let definitions, presets, feedbacks
	self.setActionDefinitions = (value) => {
		definitions = value
	}
	self.setPresetDefinitions = (_sections, value) => {
		presets = value
	}
	self.setFeedbackDefinitions = (value) => {
		feedbacks = value
	}
	UpdateActions(self)
	UpdatePresets(self)
	UpdateFeedbacks(self)
	const freezePreset = presets.freeze_last_slide
	assert.equal(freezePreset.type, 'layered')
	const label = freezePreset.elements.find((element) => element.type === 'text' && element.id === 'text0')
	assert.equal(label.text, 'FREEZE\nLAST\nSLIDE')
	assert.equal(label.fontsize, 20)
	assert.deepEqual([label.x, label.y, label.width, label.height], [6, 8, 88, 84])
	assert.equal(label.fontsizeAllowShrink, true)
	assert.equal(
		freezePreset.elements.find((element) => element.type === 'image').base64Image,
		`data:image/png;base64,${OUTPUT_ICONS.buttonBorderBlack}`,
	)
	assert.equal(freezePreset.elements.find((element) => element.type === 'box').color, 0x303438)
	for (const [state, colour] of [
		['pending', 0xff9d00],
		['on', 0x40ff40],
	]) {
		const feedback = freezePreset.feedbacks.find(
			(item) => item.feedbackId === 'freeze_state' && item.options.state === state,
		)
		assert.equal(
			feedback.styleOverrides.find((item) => item.elementProperty === 'color' && item.elementId === 'box0').override
				.value,
			colour,
		)
		assert.ok(!feedback.styleOverrides.some((item) => item.elementProperty === 'base64Image'))
	}
	assert.deepEqual(presets.freeze_last_slide.steps[0].down[0], {
		actionId: 'freeze_last_slide',
		options: { source: 0, mode: 'toggle' },
	})
	const commands = []
	self.sendControl = async (payload, signal) => {
		commands.push({ payload, signal })
	}
	const signal = new AbortController().signal
	await definitions.freeze_last_slide.callback({ options: { source: 0, mode: 'toggle' } }, { signal })
	assert.deepEqual(commands.pop(), { payload: { action: 'freeze-last-slide', source: 2, mode: 'toggle' }, signal })
	assert.equal(self.values.freeze_state, 'OFF')
	assert.equal(feedbacks.freeze_state.callback({ options: { source: 0, state: 'on' } }), false)
	self.applyState({ activePpt: 2, freezeLastSlide: { source: 2, available: true, enabled: false, pending: true } })
	await self.sendFreezeLastSlide(0, 'toggle', signal)
	assert.equal(commands.length, 0)
	assert.equal(self.values.freeze_state, 'PENDING')
	assert.equal(feedbacks.freeze_state.callback({ options: { source: 0, state: 'pending' } }), true)
	self.applyState({ activePpt: 2, freezeLastSlide: { source: 2, available: true, enabled: true, pending: false } })
	assert.equal(self.values.freeze_state, 'ON')
	assert.equal(feedbacks.freeze_state.callback({ options: { source: 0, state: 'on' } }), true)
	self.markOffline()
	assert.equal(self.values.freeze_state, 'UNAVAILABLE')
})

test('Freeze does not target an unsupported or stale source, and supports explicit source selection', async () => {
	const self = moduleFixture()
	self.connected = true
	const commands = []
	self.sendControl = async (payload) => {
		commands.push(payload)
	}
	self.state = { activePpt: 1 }
	await self.sendFreezeLastSlide(0, 'toggle')
	assert.equal(commands.length, 0)
	self.state = {
		activePpt: 2,
		freezeLastSlide: { source: 1, available: true, enabled: true, pending: false },
		pptSources: [{ id: 3, freezeLastSlide: { available: true, enabled: false, pending: false } }],
	}
	await self.sendFreezeLastSlide(0, 'toggle')
	assert.equal(commands.length, 0)
	await self.sendFreezeLastSlide(3, 'on')
	assert.deepEqual(commands.pop(), { action: 'freeze-last-slide', source: 3, mode: 'on' })
	assert.equal(freezeLastSlideState(self.state, 5).available, false)
	assert.equal(freezeLastSlideState({ activePpt: 1, freezeLastSlide: { source: 1, available: true } }).available, false)
	const controller = new AbortController()
	controller.abort()
	await self.sendFreezeLastSlide(3, 'on', controller.signal)
	assert.equal(commands.length, 0)
})

test('rapid Freeze presses send only one command before the HTTP acknowledgement', async () => {
	const self = moduleFixture()
	self.connected = true
	self.state = { activePpt: 1, freezeLastSlide: { source: 1, available: true, enabled: false, pending: false } }
	let finish
	const waiting = new Promise((resolve) => {
		finish = resolve
	})
	let commands = 0
	self.sendControl = async () => {
		commands++
		await waiting
	}
	const first = self.sendFreezeLastSlide(0, 'toggle')
	await self.sendFreezeLastSlide(0, 'toggle')
	assert.equal(commands, 1)
	finish()
	await first
	await self.sendFreezeLastSlide(0, 'toggle')
	assert.equal(commands, 2)
})

test('Auto load toggle follows saved state, blocks missing folders and ignores duplicate presses', async () => {
	const self = moduleFixture()
	self.applyState({ autoLoadPpt: { available: true, enabled: false, canChange: true, folderLinked: false } })
	const commands = []
	let finish
	self.sendControl = async (payload, signal) => {
		commands.push({ payload, signal })
		await new Promise((resolve) => {
			finish = resolve
		})
		self.applyState({ autoLoadPpt: { available: true, enabled: true, canChange: true, folderLinked: true } })
	}
	await self.sendAutoLoadPpt('toggle')
	assert.equal(commands.length, 0)
	assert.match(self.logs.at(-1).message, /Settings > PowerPoint/)
	self.applyState({ autoLoadPpt: { available: true, enabled: false, canChange: true, folderLinked: true } })
	const signal = new AbortController().signal
	const pending = self.sendAutoLoadPpt('toggle', signal)
	assert.equal(self.autoLoadStatus(), 'PENDING')
	await self.sendAutoLoadPpt('toggle', signal)
	assert.deepEqual(commands, [{ payload: { action: 'auto-load-ppt', mode: 'toggle' }, signal }])
	finish()
	await pending
	assert.equal(self.autoLoadStatus(), 'ON')
	assert.equal(self.values.auto_load_state, 'ON')
	self.applyState({ autoLoadPpt: { available: true, enabled: true, canChange: false, folderLinked: true } })
	await self.sendAutoLoadPpt('off')
	assert.equal(commands.length, 1)
	self.markOffline()
	assert.equal(self.autoLoadStatus(), 'UNAVAILABLE')
	assert.equal(self.values.auto_load_state, 'UNAVAILABLE')
})

test('Presenter displays are read-only and scale long names inside bounded text areas', () => {
	const self = moduleFixture()
	Object.defineProperty(self, 'label', { value: 'Show_Clock' })
	let presets
	self.setPresetDefinitions = (_sections, definitions) => {
		presets = definitions
	}
	UpdatePresets(self)
	const longName = 'Professor Alexandra Catherine Montgomery-Wellington'
	self.applyState({ currentPresenterTitle: longName, nextPresenterTitle: 'Dr Taylor' })
	assert.equal(self.values.current_presenter, longName)
	assert.equal(self.values.next_presenter, 'Dr Taylor')
	assert.equal(self.values.next_presenter_display, 'DR\nTAYLOR')
	assert.equal(self.values.current_presenter_display, 'PROFE...\nALEXA...')
	self.applyState({ currentPresenterTitle: 'Wendy Connellington' })
	assert.equal(self.values.current_presenter_display, 'WENDY\nCONNE...')
	for (const id of ['current_presenter', 'next_presenter']) {
		const preset = presets[id]
		assert.equal(preset.type, 'layered')
		assert.deepEqual(preset.steps, [])
		const name = preset.elements.find((element) => element.id === 'text0')
		const header = preset.elements.find((element) => element.id === 'presenterHeader')
		assert.equal(name.text, `$(Show_Clock:${id}_display)`)
		assert.equal(name.fontsizeAllowShrink, true)
		assert.ok(name.x >= 0 && name.x + name.width <= 100 && name.y + name.height <= 100)
		assert.ok(header.y + header.height <= name.y)
		assert.equal(header.text, id === 'current_presenter' ? 'CURRENT' : 'NEXT')
		assert.equal(header.fontsize, 48)
		assert.equal(header.fontsizeAllowShrink, false)
		assert.equal(name.fontsize, 42)
	}
	assert.deepEqual(presets.auto_load_ppt.steps[0].down[0], { actionId: 'auto_load_ppt', options: { mode: 'toggle' } })
	assert.deepEqual(presets.clear_message.steps[0].down[0], { actionId: 'clear_message', options: {} })
	self.markOffline()
	assert.equal(self.values.current_presenter, '--')
	assert.equal(self.values.next_presenter, '--')
	assert.equal(self.values.current_presenter_display, '--')
	const autoText = presets.auto_load_ppt.elements.find((element) => element.id === 'text0')
	assert.equal(autoText.text, 'AUTO\nLOAD\nPPT')
	assert.equal(presets.clear_message.elements.find((element) => element.id === 'text0').fontsize, 20)
	const armed = presets.arm.feedbacks.find((feedback) => feedback.feedbackId === 'arm_active')
	assert.ok(
		armed.styleOverrides.some(
			(override) => override.elementProperty === 'color' && override.override.value === 0xe02020,
		),
	)
})

test('next media button shows click-to-play waiting and clears on playback', () => {
	const self = moduleFixture()
	self.applyState({ mainWarnings: [{ text: 'PPT MAIN - CURRENT SLIDE - WAITING FOR CLICK TO PLAY - HAS AUDIO' }] })
	assert.equal(self.values.next_media_warning, 'WAITING\nCLICK TO\nPLAY')
	for (const mediaState of ['', 'READY', 'CUED']) {
		self.applyState({ currentSlideMediaStartMode: 'click', mediaState })
		assert.equal(self.values.next_media_warning, 'WAITING\nCLICK TO\nPLAY')
	}
	for (const mediaState of ['PLAYING', 'PAUSED']) {
		self.applyState({ currentSlideMediaStartMode: 'click', mediaState, nextSlideMediaKind: 'video' })
		assert.equal(self.values.next_media_warning, 'VIDEO NEXT')
	}
	self.applyState({ currentSlideMediaStartMode: 'click', currentSlideOnlineVideo: true })
	assert.equal(self.values.next_media_warning, '-')
	self.applyState({ currentSlideMediaStartMode: 'click', mediaSource: 'QLAB' })
	assert.equal(self.values.next_media_warning, '-')
	self.applyState({
		currentSlideMediaStartMode: 'click',
		mediaState: 'STOPPED',
		mediaDuration: '0:30',
		mediaRemaining: '0:30',
	})
	assert.equal(self.values.next_media_warning, 'WAITING\nCLICK TO\nPLAY')
	self.applyState({
		currentSlideMediaStartMode: 'click',
		mediaState: 'STOPPED',
		mediaDuration: '0:30',
		mediaRemaining: '0:00',
	})
	assert.equal(self.values.next_media_warning, '-')
})

test('pre-cancelled commands send no HTTP request or failure status', async () => {
	let requests = 0
	await serve(
		(_request, response) => {
			requests++
			response.end('{}')
		},
		async (config) => {
			const self = moduleFixture()
			self.config = config
			const controller = new AbortController()
			controller.abort()
			await self.sendControl({ action: 'start' }, controller.signal)
			assert.equal(requests, 0)
			assert.deepEqual(self.statuses, [])
			assert.deepEqual(self.logs, [])
		},
	)
})

test(
	'cancelling an in-flight action closes its request without a failure or stale state',
	{ timeout: 3000 },
	async () => {
		let requestReceived
		const received = new Promise((resolve) => {
			requestReceived = resolve
		})
		let responseClosed
		const closed = new Promise((resolve) => {
			responseClosed = resolve
		})
		let reply
		await serve(
			(_request, response) => {
				reply = response
				response.on('close', responseClosed)
				requestReceived()
			},
			async (config) => {
				const self = moduleFixture()
				self.config = config
				const controller = new AbortController()
				const pending = self.sendControl({ action: 'start' }, controller.signal)
				await received
				controller.abort()
				await pending
				await closed
				reply.end(JSON.stringify({ isRunning: true }))
				assert.deepEqual(self.state, {})
				assert.deepEqual(self.statuses, [])
				assert.deepEqual(self.logs, [])
			},
		)
	},
)

test('current C4 state projects custom labels, slides and navigation locks', async () => {
	const state = {
		timerText: '0:10:00',
		operatorTimerText: '0:09:59',
		isRunning: false,
		canPreviousPresenter: true,
		canNextPresenter: true,
		slide: '3 of 20',
		sectionSlidesRemaining: 2,
		singleDeckMode: true,
		activePpt: 3,
		pptSources: [
			{ id: 1, name: 'Stage Main' },
			{ id: 3, name: 'Laptop Left' },
		],
		presetsSeconds: [60, 120, 180, 240, 300, 360],
	}
	await serve(
		(request, response) => {
			assert.equal(request.method, 'GET')
			assert.equal(request.url, '/api/state')
			response.setHeader('content-type', 'application/json')
			response.end(JSON.stringify(state))
		},
		async (config) => {
			const self = moduleFixture()
			self.config = config
			await self.pollState()
			assert.equal(self.values.timer, '09:59')
			assert.equal(self.values.slide, '3/20')
			assert.equal(self.values.slides_left, '2')
			assert.equal(self.values.ppt1_label, 'Stage Main')
			assert.equal(self.values.active_ppt_label, 'Laptop Left')
			assert.equal(self.quickPresetSeconds(4), 240)
			state.singleDeckMode = false
			state.isRunning = true
			state.canPreviousPresenter = false
			state.canNextPresenter = false
			await self.pollState()
			assert.equal(self.values.slides_left, '17')
			assert.equal(self.state.canNextPresenter, false)
			assert.equal(self.state.canPreviousPresenter, false)
			assert.equal(self.values.run_state, 'RUNNING')
		},
	)
})

test('slides left follows deck navigation unless Single Deck section mode is enabled', () => {
	const self = moduleFixture()
	for (const singleDeckMode of [false, undefined]) {
		for (let current = 1; current <= 5; current++) {
			self.applyState({ slide: `${current} of 5`, sectionSlidesRemaining: 2, singleDeckMode })
			assert.equal(self.values.slides_left, String(5 - current))
			assert.equal(self.values.section_slides_left, '2')
		}
	}
	for (const remaining of [2, 1, 0]) {
		self.applyState({ slide: '3 of 20', sectionSlidesRemaining: remaining, singleDeckMode: true })
		assert.equal(self.values.slides_left, String(remaining))
	}
	for (const remaining of [undefined, -1, Number.NaN]) {
		self.applyState({ slide: '3 of 20', sectionSlidesRemaining: remaining, singleDeckMode: true })
		assert.equal(self.values.slides_left, '17')
	}
	self.applyState({ slide: '2 of 5', sectionSlidesRemaining: 2, singleDeckMode: true })
	self.applyState({ slide: '4 of 12', sectionSlidesRemaining: 2, singleDeckMode: false, activePpt: 2 })
	assert.equal(self.values.slides_left, '8')
})

test('commands use JSON POST once, and permission failures are not retried', async () => {
	const commands = []
	await serve(
		(request, response) => {
			assert.equal(request.url, '/api/control')
			assert.equal(request.method, 'POST')
			assert.equal(request.headers['content-type'], 'application/json')
			let body = ''
			request.on('data', (chunk) => {
				body += chunk
			})
			request.on('end', () => {
				const command = JSON.parse(body)
				commands.push(command)
				response.setHeader('content-type', 'application/json')
				response.statusCode = command.action === 'start' ? 200 : 403
				response.end(
					JSON.stringify(command.action === 'start' ? { isRunning: true } : { error: 'Web Control disabled' }),
				)
			})
		},
		async (config) => {
			const self = moduleFixture()
			self.config = config
			await self.sendControl({ action: 'start' })
			assert.equal(self.state.isRunning, true)
			await self.sendControl({ action: 'next-presenter' })
			assert.match(self.statuses.at(-1).message, /HTTP 403/)
			assert.deepEqual(commands, [{ action: 'start' }, { action: 'next-presenter' }])
		},
	)
})

test('destroy ignores an in-flight state response and stops polling', async () => {
	let release
	const received = new Promise((resolve) => {
		release = resolve
	})
	let response
	await serve(
		(request, reply) => {
			response = reply
			release()
		},
		async (config) => {
			const self = moduleFixture()
			self.config = config
			const pending = self.pollState()
			await received
			await self.destroy()
			response.end(JSON.stringify({ timerText: '0:01:00', isRunning: true }))
			await pending
			assert.equal(self.connected, false)
			assert.deepEqual(self.state, {})
			assert.equal(self.pollTimer, undefined)
		},
	)
})
