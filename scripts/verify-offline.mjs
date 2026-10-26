import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import ModuleInstance from '../dist/main.js'
import { UpdateFeedbacks } from '../dist/feedbacks.js'
import { UpdatePresets } from '../dist/presets.js'

const self = Object.create(ModuleInstance.prototype)
Object.assign(self, {
	state: {},
	connected: false,
	polling: false,
	generation: 0,
	setVariableValues(values) {
		this.values = { ...this.values, ...values }
	},
	checkFeedbacks() {},
	updateStatus() {},
	log() {},
	setFeedbackDefinitions(value) {
		this.feedbacks = value
	},
	setPresetDefinitions(sections, value) {
		this.presets = value
	},
})
Object.defineProperty(self, 'label', { value: 'My_Clock' })
UpdateFeedbacks(self)
UpdatePresets(self)
assert.equal(self.feedbacks.c4_offline.callback(), true)
for (const preset of Object.values(self.presets)) {
	assert.equal(preset.feedbacks.at(-1).feedbackId, 'c4_offline')
	if (preset.type === 'simple') {
		assert.equal(preset.feedbacks.at(-1).style.text, 'C4\nOFFLINE')
		assert.equal(preset.feedbacks.at(-1).style.png64, '')
	} else {
		const overlay = preset.elements.find((item) => item.id === 'c4OfflineText')
		assert.equal(overlay.text, 'C4\nOFFLINE')
		assert.equal(overlay.enabled, false)
		assert.ok(
			preset.feedbacks
				.at(-1)
				.styleOverrides.some((item) => item.elementId === overlay.id && item.override.value === true),
		)
	}
	assert.doesNotMatch(JSON.stringify(preset), /\$\(C4_Clock:/)
}
// Building presets again must not mutate the original layered templates.
UpdatePresets(self)
assert.equal(self.presets.timer.elements.filter((item) => item.id === 'c4OfflineText').length, 1)
let fail = false
const server = createServer((request, response) => {
	response.writeHead(fail ? 503 : 200, { 'content-type': 'application/json' })
	response.end(JSON.stringify(fail ? { error: 'offline fixture' } : { timerText: '0:10:00', isRunning: true }))
})
server.listen(0, '127.0.0.1')
await once(server, 'listening')
try {
	self.config = { host: '127.0.0.1', port: server.address().port }
	await self.pollState()
	assert.equal(self.feedbacks.c4_offline.callback(), false)
	assert.equal(self.state.isRunning, true)
	fail = true
	await self.pollState()
	assert.equal(self.feedbacks.c4_offline.callback(), true)
	assert.deepEqual(self.state, {})
	assert.equal(self.values.connection, 'OFFLINE')
	fail = false
	await self.pollState()
	assert.equal(self.feedbacks.c4_offline.callback(), false)
} finally {
	server.closeAllConnections()
	await new Promise((resolve) => server.close(resolve))
}
console.log('PASS: all normal presets show grey C4 OFFLINE; custom labels, template isolation, HTTP loss and recovery.')
