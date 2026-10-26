import assert from 'node:assert/strict'
import { once } from 'node:events'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import test from 'node:test'
import ModuleInstance, { timerColours } from '../dist/main.js'
import { UpdatePresets } from '../dist/presets.js'
import { UpdateActions } from '../dist/actions.js'

function moduleFixture() {
	const self = Object.create(ModuleInstance.prototype)
	Object.assign(self, {
		state: {},
		connected: false,
		polling: false,
		generation: 0,
		values: {},
		statuses: [],
		setVariableValues(values) {
			Object.assign(this.values, values)
		},
		checkFeedbacks() {},
		log() {},
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
	assert.equal(manifest.runtime.type, 'node22')
	assert.match(pkg.engines.node, /^\^22\./)
	const layout = await read('../design-assets/preset-layout.json')
	assert.deepEqual(Object.keys(layout).sort(), ['imageLibrary', 'page'])
	assert.deepEqual(Object.keys(layout.page), ['controls'])
	assert.doesNotMatch(JSON.stringify(layout), /192\.168\.|"instances"|"moduleId"|"host"|"password"|"token"/)
})

test('timer colours follow C4 instead of local time thresholds, with readable contrast', () => {
	const self = moduleFixture()
	for (const [colour, seconds, expectedBackground, expectedForeground] of [
		['#FFB22B', 900, 0xffb22b, 0x000000],
		['#29D158', 30, 0x29d158, 0x000000],
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
		['#29D158', '#FFFFFF', 30, 0x29d158],
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
	UpdateActions({
		setActionDefinitions(value) {
			definitions = value
		},
		sendControl: async (value) => {
			sent.push(value)
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
	}
	for (const [id, action] of Object.entries(fixed)) {
		await definitions[id].callback({ options: {} })
		assert.deepEqual(sent.pop(), { action })
	}
	await definitions.quick_preset.callback({ options: { index: 4 } })
	assert.deepEqual(sent.pop(), { action: 'set-duration', seconds: 240 })
	await definitions.jog.callback({ options: { seconds: -60 } })
	assert.deepEqual(sent.pop(), { action: 'jog', seconds: -60 })
	for (const mode of ['timer', 'clock', 'notes', 'black', 'off']) {
		await definitions.output.callback({ options: { mode } })
		assert.deepEqual(sent.pop(), { action: 'output', mode })
	}
	for (const source of [1, 2, 3, 4]) {
		await definitions.ppt_source.callback({ options: { source } })
		assert.deepEqual(sent.pop(), { action: 'ppt', source })
	}
	assert.equal(sent.length, 0)
})

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
