import assert from 'node:assert/strict'
import { UpdateFeedbacks } from '../dist/feedbacks.js'
import { formatEndsLabel, formatPptButtonLabel } from '../dist/main.js'
import { OUTPUT_ICONS } from '../dist/output-icons.js'
import { UpdatePresets } from '../dist/presets.js'

assert.equal(formatEndsLabel({ isOverdue: false, endTimeLabel: 'Ends' }), 'ENDS AT')
assert.equal(formatEndsLabel({ isOverdue: true, endTimeLabel: 'Ends' }), 'OVER BY')
assert.equal(formatEndsLabel({ isOverdue: false, endTimeLabel: 'OVER BY' }), 'OVER BY')
assert.equal(formatPptButtonLabel('PPT BU'), 'PPT\nBU')
assert.equal(formatPptButtonLabel('PPT MAIN'), 'PPT\nMAIN')
assert.equal(formatPptButtonLabel('My deck'), 'My deck')

for (const [name, png64] of Object.entries(OUTPUT_ICONS)) {
	const png = Buffer.from(png64, 'base64')
	assert.equal(png.readUInt32BE(16), 72, `${name} width`)
	assert.equal(png.readUInt32BE(20), 72, `${name} height`)
}

let feedbacks
const feedbackModule = {
	state: {},
	setFeedbackDefinitions(definitions) {
		feedbacks = definitions
	},
}

UpdateFeedbacks(feedbackModule)

async function feedback(id, options = {}) {
	return feedbacks[id].callback({ options })
}
assert.equal(await feedback('ends_overdue'), false)
feedbackModule.state.isOverdue = true
assert.equal(await feedback('ends_overdue'), true)
feedbackModule.state.isOverdue = false
feedbackModule.state.endTimeLabel = 'OVER BY'
assert.equal(await feedback('ends_overdue'), true)
feedbackModule.state.endTimeLabel = 'Ends'
assert.equal(await feedback('ends_overdue'), false)

feedbackModule.state.nextSlideMediaKind = 'video'
assert.equal(await feedback('media_next'), true)
feedbackModule.state.nextSlideMediaKind = ' VIDEO '
assert.equal(await feedback('media_next'), true)
feedbackModule.state.nextSlideMediaKind = 'audio and video'
assert.equal(await feedback('media_next'), true)
feedbackModule.state.nextSlideMediaKind = ''
assert.equal(await feedback('media_next'), false)

feedbackModule.state.remainingSeconds = 300
assert.equal(await feedback('time_threshold', { level: 'five' }), true)
feedbackModule.state.remainingSeconds = 301
assert.equal(await feedback('time_threshold', { level: 'five' }), false)
feedbackModule.state.remainingSeconds = 60
assert.equal(await feedback('time_threshold', { level: 'one' }), true)
assert.equal(await feedback('time_threshold', { level: 'five' }), false)
feedbackModule.state.remainingSeconds = 61
assert.equal(await feedback('time_threshold', { level: 'one' }), false)
assert.equal(await feedback('time_threshold', { level: 'five' }), true)

feedbackModule.state.outputMode = 'clock'
assert.equal(await feedback('output_mode', { mode: 'clock' }), true)
assert.equal(await feedback('output_mode', { mode: 'timer' }), false)
feedbackModule.state.activePpt = 1
assert.equal(await feedback('ppt_source', { source: 1 }), true)
assert.equal(await feedback('ppt_source', { source: 2 }), false)
feedbackModule.state.activePpt = 4
assert.equal(await feedback('ppt_source', { source: 4 }), true)
feedbackModule.state.sessionDeltaClass = 'over'
assert.equal(await feedback('session_state', { state: 'behind' }), true)
assert.equal(await feedback('session_state', { state: 'ahead' }), false)
feedbackModule.state.sessionDeltaClass = 'under'
assert.equal(await feedback('session_state', { state: 'ahead' }), true)
assert.equal(await feedback('session_state', { state: 'behind' }), false)
feedbackModule.state.sessionDeltaClass = 'onTime'
assert.equal(await feedback('session_state', { state: 'on-time' }), true)

let sections
let presets
UpdatePresets({
	setPresetDefinitions(nextSections, nextPresets) {
		sections = nextSections
		presets = nextPresets
	},
})

const mediaSection = sections[0].definitions.find((section) => section.id === 'media')
assert.deepEqual(mediaSection.presets, ['media_remaining', 'video_next'])
const exportedPresetIds = [
	'output_timer',
	'output_clock',
	'output_notes',
	'output_black',
	'output_off',
	'previous',
	'play_pause',
	'next',
	'ppt_1',
	'ppt_2',
	'ppt_3',
	'ppt_4',
	'slides_left',
	'current_slide',
	'timer',
	'ends_at',
	'minute_minus',
	'media_remaining',
	'video_next',
	'pace_eta',
	'session_delta',
	'pace',
	'minute_plus',
	'quick_1',
	'quick_2',
	'quick_3',
	'quick_4',
	'quick_5',
	'quick_6',
	'reset',
]
for (const id of exportedPresetIds) {
	assert.equal(presets[id].type, 'layered', `${id} should be a direct layered preset`)
	assert.ok(presets[id].elements.length > 0, `${id} should retain its exported layers`)
}

const allowedElementKeys = {
	box: new Set([
		'id',
		'name',
		'type',
		'enabled',
		'opacity',
		'x',
		'y',
		'width',
		'height',
		'rotation',
		'color',
		'borderWidth',
		'borderColor',
		'borderPosition',
		'cornerRadius',
	]),
	image: new Set([
		'id',
		'name',
		'type',
		'enabled',
		'opacity',
		'x',
		'y',
		'width',
		'height',
		'rotation',
		'base64Image',
		'halign',
		'valign',
		'fillMode',
	]),
	text: new Set([
		'id',
		'name',
		'type',
		'enabled',
		'opacity',
		'x',
		'y',
		'width',
		'height',
		'rotation',
		'text',
		'fontsize',
		'fontsizeAllowShrink',
		'font',
		'weight',
		'styles',
		'color',
		'halign',
		'valign',
		'outlineColor',
	]),
}
for (const id of exportedPresetIds) {
	for (const element of presets[id].elements) {
		assert.ok(allowedElementKeys[element.type], `${id} has unsupported ${element.type} layer`)
		for (const key of Object.keys(element)) {
			assert.ok(allowedElementKeys[element.type].has(key), `${id}.${element.id} has unsupported property ${key}`)
		}
		for (const key of ['x', 'y', 'width', 'height']) {
			const rawValue = element[key]
			if (rawValue?.isExpression === true) {
				assert.equal(typeof rawValue.value, 'string', `${id}.${element.id}.${key} expression must be a string`)
				continue
			}
			const value = rawValue?.isExpression === false ? rawValue.value : rawValue
			if (typeof value === 'number') {
				assert.ok(value >= 0 && value <= 100, `${id}.${element.id}.${key} must be within Companion's 0..100 bounds`)
			}
		}
		if (element.type === 'image') {
			const image = element.base64Image?.value ?? element.base64Image
			assert.doesNotMatch(image || '', /^\$\(image:/, `${id}.${element.id} must not depend on a page image library`)
		}
	}
}

const negativePositionExpressions = [
	['slides_left', 'SLIDES LEFT', '-24'],
	['current_slide', 'SLIDES', '-23'],
	['timer', 'TIME LEFT', '-29'],
	['media_remaining', 'MEDIA', '-29'],
	['session_delta', 'SESSION', '-28'],
	['session_delta', 'UNDER/OVER', '-14'],
]
for (const [id, text, expectedY] of negativePositionExpressions) {
	const element = presets[id].elements.find((candidate) => candidate.type === 'text' && candidate.text === text)
	assert.ok(element, `${id} should retain its ${text} text layer`)
	assert.deepEqual(
		element.y,
		{ value: expectedY, isExpression: true },
		`${id}.${text} should retain its exact negative y position`,
	)
}

const layeredText = (id) =>
	presets[id].elements
		.filter((element) => element.type === 'text')
		.map((element) => element.text?.value ?? element.text)
		.join('\n')

assert.match(layeredText('slides_left'), /\$\(C4_Clock:slides_left\)/)
assert.match(layeredText('current_slide'), /\$\(C4_Clock:slide\)/)
assert.match(layeredText('timer'), /\$\(C4_Clock:timer\)/)
assert.match(layeredText('session_delta'), /\$\(C4_Clock:session_delta\)/)
assert.match(layeredText('media_remaining'), /\$\(C4_Clock:media_remaining\)/)
assert.deepEqual(presets.minute_minus.steps[0].down[0], { actionId: 'jog', options: { seconds: -60 } })
assert.deepEqual(presets.minute_plus.steps[0].down[0], { actionId: 'jog', options: { seconds: 60 } })
const expectedPresetActions = {
	previous: 'presenter_previous',
	minute_minus: 'jog',
	play_pause: 'toggle',
	minute_plus: 'jog',
	next: 'presenter_next',
	reset: 'reset',
	output_timer: 'output',
	output_clock: 'output',
	output_notes: 'output',
	output_black: 'output',
	output_off: 'output',
	ppt_1: 'ppt_source',
	ppt_2: 'ppt_source',
	ppt_3: 'ppt_source',
	ppt_4: 'ppt_source',
	quick_1: 'quick_preset',
	quick_2: 'quick_preset',
	quick_3: 'quick_preset',
	quick_4: 'quick_preset',
	quick_5: 'quick_preset',
	quick_6: 'quick_preset',
}
for (const [id, actionId] of Object.entries(expectedPresetActions)) {
	assert.equal(presets[id].steps[0].down[0].actionId, actionId, `${id} must retain its press action`)
}
assert.equal(presets.output_timer.feedbacks[0].feedbackId, 'output_mode')
const overdueDisplay = presets.ends_at.feedbacks.find((item) => item.feedbackId === 'ends_overdue')
for (const text of presets.ends_at.elements.filter(
	(element) => element.type === 'text' && element.id !== 'c4OfflineText',
)) {
	assert.ok(
		overdueDisplay.styleOverrides.some(
			(override) =>
				override.elementId === text.id && override.elementProperty === 'color' && override.override.value === 0xe02020,
		),
	)
}
for (const [id, label] of [
	['previous', 'PREV'],
	['next', 'NEXT'],
]) {
	assert.equal(presets[id].elements.find((element) => element.type === 'text').text, label)
	assert.equal(
		presets[id].elements.find((element) => element.type === 'image').base64Image,
		`data:image/png;base64,${OUTPUT_ICONS.buttonBorder}`,
	)
}
assert.equal(
	presets.output_timer.elements.find((element) => element.type === 'image').base64Image,
	presets.output_clock.elements.find((element) => element.type === 'image').base64Image,
	'Inactive countdown output must use the same black border as the other outputs',
)
assert.deepEqual(presets.output_off.steps[0].down[0], { actionId: 'output', options: { mode: 'off' } })
assert.equal(presets.output_off.feedbacks[0].feedbackId, 'output_mode')
assert.equal(presets.output_off.feedbacks[0].options.mode, 'off')
assert.equal(presets.ppt_1.feedbacks[0].feedbackId, 'ppt_source')
assert.equal(presets.ppt_3.feedbacks[0].feedbackId, 'ppt_source')
assert.equal(presets.ppt_4.feedbacks[0].options.source, 4)
assert.ok(!presets.timer.feedbacks.some((item) => ['time_threshold', 'overdue'].includes(item.feedbackId)))
assert.deepEqual(presets.timer.elements.find((element) => element.type === 'box').color, {
	value: '$(C4_Clock:timer_colour)',
	isExpression: true,
})
for (const element of presets.timer.elements.filter((item) => item.type === 'text' && item.id !== 'c4OfflineText')) {
	assert.deepEqual(element.color, { value: '$(C4_Clock:timer_text_colour)', isExpression: true })
	assert.deepEqual(element.outlineColor, element.color)
}
assert.ok(
	presets.session_delta.feedbacks.some(
		(item) => item.feedbackId === 'session_state' && item.options.state === 'behind',
	),
)
assert.ok(
	presets.session_delta.feedbacks.some((item) => item.feedbackId === 'session_state' && item.options.state === 'ahead'),
)
assert.ok(presets.play_pause.feedbacks.some((item) => item.feedbackId === 'running'))
assert.ok(
	!presets.play_pause.feedbacks.some((item) => item.feedbackId === 'overdue'),
	'play/pause must not turn red when overdue',
)
assert.ok(presets.pace.feedbacks.some((item) => item.feedbackId === 'pace_state'))
assert.ok(presets.pace_eta.feedbacks.some((item) => item.feedbackId === 'pace_state'))
assert.ok(presets.media_remaining.feedbacks.some((item) => item.feedbackId === 'media_active'))
assert.ok(presets.video_next.feedbacks.some((item) => item.feedbackId === 'media_next'))
const videoNextBackground = presets.video_next.elements.find((item) => item.type === 'box')
const videoNextText = presets.video_next.elements.find((item) => item.type === 'text')
assert.equal(videoNextBackground.color, 0x000000, 'VIDEO NEXT must be black while idle')
assert.equal(videoNextText.color, 0xffffff, 'VIDEO NEXT idle dash must be white')

const runningFeedback = presets.play_pause.feedbacks.find((item) => item.feedbackId === 'running')
assert.ok(
	runningFeedback.styleOverrides.some((item) => item.elementProperty === 'base64Image'),
	'running state must use the large pause image',
)
assert.ok(
	!runningFeedback.styleOverrides.some((item) => item.elementProperty === 'text'),
	'running state must not replace the pause image with text',
)
assert.ok(
	!runningFeedback.styleOverrides.some((item) => item.elementProperty === 'enabled' && item.override.value === false),
	'running state must keep the image layer enabled',
)

for (const id of ['play_pause', 'pace', 'pace_eta', 'media_remaining', 'video_next']) {
	assert.ok(
		presets[id].feedbacks.every((item) => item.styleOverrides.length > 0),
		`${id} feedbacks should change layered elements`,
	)
}

for (const id of exportedPresetIds) {
	const elementIds = new Set(presets[id].elements.map((element) => element.id))
	for (const feedback of presets[id].feedbacks) {
		assert.ok(
			feedback.styleOverrides.length > 0,
			`${id}.${feedback.feedbackId} must retain at least one style override`,
		)
		for (const override of feedback.styleOverrides) {
			assert.ok(
				elementIds.has(override.elementId),
				`${id}.${feedback.feedbackId} references missing element ${override.elementId}`,
			)
			assert.equal(
				typeof override.override,
				'object',
				`${id}.${feedback.feedbackId} override must use Companion's expression wrapper`,
			)
			assert.equal(
				typeof override.override.isExpression,
				'boolean',
				`${id}.${feedback.feedbackId} override must declare isExpression`,
			)
			assert.ok(Object.hasOwn(override.override, 'value'), `${id}.${feedback.feedbackId} override must contain value`)
			assert.notEqual(
				override.override.value,
				'',
				`${id}.${feedback.feedbackId} override must not contain an empty value`,
			)
		}
	}
}

for (const id of exportedPresetIds) {
	const outlinedText = presets[id].elements.filter(
		(element) => element.type === 'text' && Object.hasOwn(element, 'outlineColor'),
	)
	for (const element of outlinedText) {
		assert.deepEqual(element.outlineColor, element.color, `${id}.${element.id} outline must match its text colour`)
		for (const feedback of presets[id].feedbacks) {
			const colorOverride = feedback.styleOverrides.find(
				(override) => override.elementId === element.id && override.elementProperty === 'color',
			)
			const outlineOverride = feedback.styleOverrides.find(
				(override) => override.elementId === element.id && override.elementProperty === 'outlineColor',
			)
			if (!colorOverride && !outlineOverride) continue
			assert.ok(
				colorOverride,
				`${id}.${feedback.feedbackId}.${element.id} outline override requires a text-colour override`,
			)
			assert.ok(
				outlineOverride,
				`${id}.${feedback.feedbackId}.${element.id} text-colour override requires an outline override`,
			)
			assert.deepEqual(
				outlineOverride.override,
				colorOverride.override,
				`${id}.${feedback.feedbackId}.${element.id} outline feedback must match its text colour`,
			)
		}
	}
}

console.log('Companion preset and feedback regression checks passed.')
