import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createServer } from 'node:http'
import test from 'node:test'
import ModuleInstance from '../dist/main.js'
import { projectRadios, radioVariables, radioPreset } from '../dist/radios.js'
import { UpdatePresets } from '../dist/presets.js'

function status(channel = {}, receiver = {}) {
	return {
		receivers: [
			{
				ip: 'test-receiver',
				state: 'online',
				channels: [
					{ number: 1, label: 'HH1', state: 'online', transmitter: 'connected', percent: 85, rfDbm: -65, ...channel },
				],
				...receiver,
			},
		],
	}
}

function fixture() {
	const self = Object.create(ModuleInstance.prototype)
	Object.defineProperty(self, 'label', { value: 'Test_Clock' })
	Object.assign(self, {
		connected: true,
		state: {},
		generation: 1,
		values: {},
		definitions: {},
		statuses: [],
		setVariableValues(values) {
			Object.assign(this.values, values)
		},
		setVariableDefinitions(definitions) {
			this.definitions = definitions
		},
		setPresetDefinitions(sections, presets) {
			this.sections = sections
			this.presets = presets
		},
		checkFeedbacks() {},
		log() {},
		updateStatus(status) {
			this.statuses.push(status)
		},
	})
	return self
}

test('radio battery segments preserve percent and AA bars, including empty and unknown', () => {
	for (const [channel, value, segments] of [
		[{}, '85%', 5],
		[{ percent: 15 }, '15%', 1],
		[{ percent: 0 }, '0%', 0],
		[{ percent: null, bars: 2 }, '2/5 BARS', 2],
		[{ percent: null, bars: 0 }, '0/5 BARS', 0],
		[{ percent: null, bars: null }, 'UNKNOWN', 0],
		[{ percent: 101, bars: -1 }, 'UNKNOWN', 0],
	]) {
		const [radio] = projectRadios(status(channel))
		assert.equal(radio.value, value)
		assert.equal(radio.segments, segments)
	}
})

test('radio severity follows C4, not fixed Companion battery thresholds', () => {
	for (const [severity, colour] of [
		['normal', 0x40ff40],
		['warning', 0xff9d00],
		['critical', 0xe02020],
	]) {
		assert.equal(projectRadios(status({ percent: 50, severity }))[0].colour, colour)
	}
})

test('assigned speaker replaces mic heading, current speaker wins shared mic and panelists work', () => {
	const microphone = { receiverIp: 'test-receiver', channel: 1 }
	const sheet = {
		presenters: [
			{ presenterName: 'Later Speaker', microphones: [microphone] },
			{ presenterName: 'Wendy Connell', active: true, microphones: [microphone] },
		],
	}
	const [radio] = projectRadios(status(), sheet)
	assert.equal(radio.speakerName, 'Wendy Connell')
	assert.equal(radio.label, 'HH1')
	assert.equal(radioVariables([radio])[`radio_${radio.id}_label`], 'WENDY ...')
	sheet.presenters = [{ active: true, panelists: [{ name: 'Barry', microphones: [microphone] }] }]
	assert.equal(projectRadios(status(), sheet)[0].speakerName, 'Barry')
	sheet.presenters = [{ presenterName: 'Finished Speaker', finished: true, microphones: [microphone] }]
	const [unassigned] = projectRadios(status(), sheet)
	assert.equal(radioVariables([unassigned])[`radio_${radio.id}_label`], 'HH1')
	assert.equal(unassigned.id, radio.id)
})

test('speaker changes refresh placed tile variables; unavailable runsheet falls back without losing battery', async () => {
	let name = 'Barry'
	let available = true
	const server = createServer((request, response) => {
		if (request.url === '/api/audio/status') {
			response.end(JSON.stringify(status()))
			return
		}
		assert.equal(request.url, '/api/runsheet')
		response.statusCode = available ? 200 : 403
		response.end(
			JSON.stringify({
				presenters: [{ active: true, presenterName: name, microphones: [{ receiverIp: 'test-receiver', channel: 1 }] }],
			}),
		)
	})
	server.listen(0, '127.0.0.1')
	await once(server, 'listening')
	try {
		const self = fixture()
		self.config = { host: '127.0.0.1', port: server.address().port }
		await self.pollRadios()
		const [radio] = self.radios.values()
		assert.equal(self.values[`radio_${radio.id}_label`], 'BARRY')
		name = 'Wendy'
		await self.pollRadios()
		assert.equal(self.values[`radio_${radio.id}_label`], 'WENDY')
		available = false
		await self.pollRadios()
		assert.equal(self.values[`radio_${radio.id}_label`], 'HH1')
		assert.equal(self.values[`radio_${radio.id}_battery`], '85%')
	} finally {
		server.closeAllConnections()
		await new Promise((resolve) => server.close(resolve))
	}
})

test('RF uses the audio-page scale and distinguishes zero from unavailable', () => {
	for (const [rfDbm, expected] of [
		[-65, 4],
		[-66, 3],
		[-80, 3],
		[-81, 2],
		[-90, 2],
		[-91, 1],
		[-100, 1],
		[-101, 0],
		[null, null],
		[-121, null],
	]) {
		const [radio] = projectRadios(status({ rfDbm }))
		assert.equal(radio.rf, expected)
		assert.equal(radioVariables([radio])[`radio_${radio.id}_rf_label`], expected === null ? 'RF?' : 'RF')
	}
})

test('offline, stale and disconnected readings never retain old battery or RF', () => {
	for (const input of [
		status({ transmitter: 'disconnected' }),
		status({ state: 'stale' }),
		status({}, { state: 'offline' }),
		{ ...status(), feedStale: true },
	]) {
		const [radio] = projectRadios(input)
		assert.equal(radio.value, 'OFFLINE')
		assert.equal(radioVariables([radio])[`radio_${radio.id}_rf_label`], 'RF')
		assert.equal(radio.colour, 0x73787c)
		assert.equal(radio.segments, 0)
		assert.equal(radio.rf, null)
	}
	assert.deepEqual(projectRadios(status({}, { state: 'disabled' })), [])
})

test('radio identity survives receiver reorder and label changes without swapping placed tiles', () => {
	const self = fixture()
	self.applyRadioStatus(status())
	const [original] = self.radios.values()
	const second = status({}, { ip: 'second-receiver' }).receivers[0]
	self.applyRadioStatus({ receivers: [second, ...status({ label: 'NEW LABEL' }).receivers] })
	assert.equal(self.radios.get(original.id).label, 'NEW LABEL')
	self.applyRadioStatus({ receivers: [second] })
	assert.equal(self.radios.get(original.id).value, 'OFFLINE')
	assert.equal(self.radios.size, 2)
	self.applyRadioStatus(status())
	assert.equal(self.radios.get(original.id).value, '85%')
	self.markOffline()
	assert.equal(self.values[`radio_${original.id}_battery`], 'OFFLINE')
	assert.equal(self.values[`radio_${original.id}_rf_4`], 0x252a29)
})

test('radio presets use native shapes and text, local label toggle and bounded RF at the right', () => {
	const radio = projectRadios(status())[0]
	const preset = radioPreset(radio, 'Renamed_C4')
	assert.equal(preset.type, 'layered')
	assert.deepEqual(preset.steps[0].down, [{ actionId: 'radio_label', options: { id: radio.id, mode: 'mic' } }])
	assert.deepEqual(preset.steps[0].up, [{ actionId: 'radio_label', options: { id: radio.id, mode: 'speaker' } }])
	assert.equal(preset.elements.filter((e) => e.id.startsWith('cell')).length, 5)
	assert.equal(preset.elements.filter((e) => /^rf\d/.test(e.id)).length, 4)
	for (const element of preset.elements) {
		assert.ok(['box', 'text'].includes(element.type))
		assert.ok(element.x >= 0 && element.y >= 0 && element.x + element.width <= 100 && element.y + element.height <= 100)
		if (element.type === 'text') assert.match(element.text, /\$\(Renamed_C4:radio_/)
	}
	const self = fixture()
	self.applyRadioStatus(status())
	UpdatePresets(self)
	const placed = self.presets[`radio_${radio.id}`]
	assert.ok(placed.feedbacks.some((f) => f.feedbackId === 'c4_offline'))
	assert.ok(self.sections[0].definitions.some((group) => group.id === 'radio_readings'))
})

test('radio press holds mic label through polling and release restores latest speaker name', () => {
	const self = fixture()
	self.sendControl = () => {
		throw new Error('Label toggle must not send C4 commands')
	}
	self.radioRunSheet = {
		presenters: [{ active: true, presenterName: 'Barry', microphones: [{ receiverIp: 'test-receiver', channel: 1 }] }],
	}
	self.applyRadioStatus(status())
	const [radio] = self.radios.values()
	const label = `radio_${radio.id}_label`
	assert.equal(self.values[label], 'BARRY')
	self.setRadioLabel(radio.id, true)
	assert.equal(self.values[label], 'HH1')
	self.setRadioLabel(radio.id, true)
	assert.equal(self.values[label], 'HH1')
	self.applyRadioStatus(status({ percent: 15 }))
	assert.equal(self.values[label], 'HH1')
	assert.equal(self.values[`radio_${radio.id}_battery`], '15%')
	self.radioRunSheet.presenters[0].presenterName = 'Wendy'
	self.applyRadioStatus(status())
	assert.equal(self.values[label], 'HH1')
	self.setRadioLabel(radio.id, false)
	assert.equal(self.values[label], 'WENDY')
	self.setRadioLabel(radio.id, false)
	assert.equal(self.values[label], 'WENDY')
	self.setRadioLabel('unknown', true)
	assert.equal(self.values[label], 'WENDY')
})

test('radio group is visible before discovery and empty setup status is explicit', () => {
	const self = fixture()
	UpdatePresets(self)
	const previewGroup = self.sections[0].definitions.find((group) => group.id === 'radio_readings')
	assert.match(previewGroup.name, /DEMO/)
	assert.equal(previewGroup.presets.length, 5)
	for (const id of previewGroup.presets.filter((id) => id !== 'radio_setup')) {
		const preset = self.presets[id]
		assert.deepEqual(preset.steps, [])
		assert.deepEqual(preset.feedbacks, [])
		assert.doesNotMatch(JSON.stringify(preset), /\$\(/)
		assert.match(preset.elements.find((e) => e.id === 'text0').text, /^DEMO HH/)
	}
	assert.deepEqual(self.presets.radio_setup.steps, [])
	self.applyRadioStatus({ receivers: [] })
	assert.equal(self.values.radio_status, 'RADIOS\nNONE SET UP')
	self.applyRadioStatus(status())
	assert.equal(self.values.radio_status, 'RADIOS\nREADY')
	assert.equal(self.sections[0].definitions.find((group) => group.id === 'radio_readings').presets.length, 1)
	assert.ok(self.sections[0].definitions.find((group) => group.id === 'radio_readings').presets[0].startsWith('radio_'))
})

test('radio GET polling is isolated from clock/control status and blanks readings on 403 or malformed JSON', async () => {
	let responseKind = 'ok'
	let hold
	const server = createServer((request, response) => {
		assert.equal(request.method, 'GET')
		if (request.url === '/api/runsheet') {
			response.end(JSON.stringify({ presenters: [] }))
			return
		}
		assert.equal(request.url, '/api/audio/status')
		if (responseKind === 'hold') {
			hold = response
			return
		}
		response.statusCode = responseKind === '403' ? 403 : 200
		response.end(responseKind === 'ok' ? JSON.stringify(status()) : 'unavailable')
	})
	server.listen(0, '127.0.0.1')
	await once(server, 'listening')
	try {
		const self = fixture()
		self.config = { host: '127.0.0.1', port: server.address().port }
		await self.pollRadios()
		const [radio] = self.radios.values()
		assert.equal(radio.value, '85%')
		for (const kind of ['403', 'bad-json']) {
			responseKind = kind
			await self.pollRadios()
			assert.equal(self.values[`radio_${radio.id}_battery`], 'OFFLINE')
			assert.equal(self.connected, true)
			assert.equal(self.values.radio_status, kind === '403' ? 'RADIOS\nPRO REQUIRED' : 'RADIOS\nUNAVAILABLE')
			assert.deepEqual(self.statuses, [])
		}
		responseKind = 'hold'
		const pending = self.pollRadios()
		while (!hold) await new Promise((resolve) => setTimeout(resolve, 1))
		await self.destroy()
		hold.end(JSON.stringify(status()))
		await pending
		assert.equal(self.values[`radio_${radio.id}_battery`], 'OFFLINE')
	} finally {
		server.closeAllConnections()
		await new Promise((resolve) => server.close(resolve))
	}
})
