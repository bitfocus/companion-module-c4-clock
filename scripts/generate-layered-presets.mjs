import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { format, resolveConfig } from 'prettier'

const root = process.cwd()
const sourcePath = path.join(root, 'design-assets', 'preset-layout.json')
const outputPath = path.join(root, 'src', 'layered-presets.generated.ts')
const source = JSON.parse(await readFile(sourcePath, 'utf8'))
const imageLibrary = new Map(
	(source.imageLibrary || [])
		.filter((image) => image?.info?.name && image?.originalImage)
		.map((image) => [image.info.name, image.originalImage]),
)

const positions = {
	output_timer: [0, 1],
	output_clock: [0, 2],
	output_notes: [0, 3],
	output_black: [0, 4],
	previous: [0, 5],
	play_pause: [0, 6],
	next: [0, 7],
	ppt_1: [1, 1],
	ppt_2: [1, 2],
	slides_left: [1, 3],
	current_slide: [1, 4],
	timer: [1, 5],
	ends_at: [1, 6],
	minute_minus: [1, 7],
	media_remaining: [2, 1],
	video_next: [2, 2],
	pace_eta: [2, 4],
	session_delta: [2, 5],
	pace: [2, 6],
	minute_plus: [2, 7],
	quick_1: [3, 1],
	quick_2: [3, 2],
	quick_3: [3, 3],
	quick_4: [3, 4],
	quick_5: [3, 5],
	quick_6: [3, 6],
	reset: [3, 7],
}

function clean(value) {
	if (typeof value === 'string') return value.replaceAll('$(CC_Clock:', '$(C4_Clock:')
	if (Array.isArray(value)) return value.map(clean)
	if (!value || typeof value !== 'object') return value
	if (typeof value.isExpression === 'boolean' && Object.hasOwn(value, 'value')) {
		return value.isExpression ? { value: clean(value.value), isExpression: true } : clean(value.value)
	}
	return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, clean(child)]))
}

function controlAt(row, column) {
	const control = source.page?.controls?.[String(row)]?.[String(column)]
	if (!control || control.type !== 'button-layered') throw new Error(`Missing layered control at ${row},${column}`)
	return control
}

function normaliseBounds(element) {
	for (const positionKey of ['x', 'y']) {
		const position = element[positionKey]
		if (typeof position !== 'number' || position >= 0) continue

		// Companion rejects negative literal bounds but allows numeric expressions.
		// A constant expression preserves the editor's exact negative positioning.
		element[positionKey] = { value: String(position), isExpression: true }
	}
	return element
}

function resolveImageLibraryReference(element) {
	if (element.type !== 'image' || typeof element.base64Image !== 'string') return element

	const match = /^\$\(image:([^)]+)\)$/.exec(element.base64Image)
	if (!match) return element

	const embeddedImage = imageLibrary.get(match[1])
	return embeddedImage ? { ...element, base64Image: embeddedImage } : null
}

function convertElement(element) {
	const common = ['id', 'name', 'type', 'enabled', 'opacity']
	const bounds = ['x', 'y', 'width', 'height']
	const byType = {
		box: [...common, ...bounds, 'rotation', 'color', 'borderWidth', 'borderColor', 'borderPosition', 'cornerRadius'],
		image: [...common, ...bounds, 'rotation', 'base64Image', 'halign', 'valign', 'fillMode'],
		text: [
			...common,
			...bounds,
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
		],
	}
	const allowed = byType[element.type]
	if (!allowed) throw new Error(`Unsupported exported layer type: ${element.type}`)

	const converted = normaliseBounds(
		clean(
			Object.fromEntries(
				allowed.filter((key) => element[key] !== undefined).map((key) => [key, structuredClone(element[key])]),
			),
		),
	)

	return resolveImageLibraryReference(converted)
}

function convertFeedback(feedback) {
	return {
		feedbackId: feedback.definitionId,
		options: clean(feedback.options || {}),
		isInverted: feedback.isInverted?.value === true,
		styleOverrides: (feedback.styleOverrides || [])
			.filter(
				(override) =>
					!(override.elementProperty === 'outlineColor' && (override.override?.value ?? override.override) === ''),
			)
			.map((override) => ({
				elementId: override.elementId,
				elementProperty: override.elementProperty,
				override: expressionValue(override.override),
			})),
	}
}

function expressionValue(value) {
	if (value && typeof value === 'object' && typeof value.isExpression === 'boolean' && Object.hasOwn(value, 'value')) {
		return { value: clean(value.value), isExpression: value.isExpression }
	}

	return { value: clean(value), isExpression: false }
}

function synchronizeTextOutlines(layout) {
	const outlinedTextIds = new Set()
	for (const element of layout.elements) {
		if (element.type !== 'text' || !Object.hasOwn(element, 'outlineColor')) continue
		element.outlineColor = structuredClone(element.color)
		outlinedTextIds.add(element.id)
	}

	for (const feedback of layout.feedbacks) {
		const synchronizedOverrides = feedback.styleOverrides.filter(
			(override) => !(outlinedTextIds.has(override.elementId) && override.elementProperty === 'outlineColor'),
		)
		for (const override of synchronizedOverrides.filter(
			(candidate) => outlinedTextIds.has(candidate.elementId) && candidate.elementProperty === 'color',
		)) {
			synchronizedOverrides.push({
				elementId: override.elementId,
				elementProperty: 'outlineColor',
				override: structuredClone(override.override),
			})
		}
		feedback.styleOverrides = synchronizedOverrides
	}
}

const layouts = {}
for (const [id, [row, column]] of Object.entries(positions)) {
	const control = controlAt(row, column)
	const canvas = control.style.layers.find((element) => element.type === 'canvas')
	const layout = {
		canvas: canvas ? clean({ decoration: canvas.decoration, showStatusIcons: canvas.showStatusIcons }) : undefined,
		elements: control.style.layers
			.filter((element) => element.type !== 'canvas')
			.map(convertElement)
			.filter((element) => element !== null),
		feedbacks: (control.feedbacks || []).map(convertFeedback),
	}
	synchronizeTextOutlines(layout)
	layouts[id] = layout
}

// The exported page captured VIDEO NEXT while its warning feedback was active.
// Presets must start idle: black with a white dash, then turn orange via feedback.
const videoNext = layouts.video_next
const videoNextBackground = videoNext.elements.find((element) => element.type === 'box')
const videoNextText = videoNext.elements.find((element) => element.type === 'text')
if (!videoNextBackground || !videoNextText) throw new Error('VIDEO NEXT layers were not found in the exported page')
videoNextBackground.color = 0x000000
videoNextText.color = 0xffffff
if (Object.hasOwn(videoNextText, 'outlineColor')) videoNextText.outlineColor = 0xffffff

const outputOff = structuredClone(layouts.output_black)
const outputOffText = outputOff.elements.find((element) => element.type === 'text')
if (!outputOffText) throw new Error('Output text layer was not found in the exported page')
outputOffText.text = 'OUTPUT\nOFF'
outputOffText.fontsize = 18
outputOff.feedbacks = []
layouts.output_off = outputOff

for (const source of [3, 4]) {
	const layout = structuredClone(layouts.ppt_2)
	for (const element of layout.elements.filter((candidate) => candidate.type === 'text')) {
		if (typeof element.text === 'string') element.text = element.text.replace('ppt2_label', `ppt${source}_label`)
	}
	for (const feedback of layout.feedbacks) {
		if (feedback.feedbackId === 'ppt_source') feedback.options.source = source
	}
	layouts[`ppt_${source}`] = layout
}

const session = layouts.session_delta
const sessionBox = session.elements.find((element) => element.type === 'box' && element.name === 'Box')
if (!sessionBox?.id) throw new Error('Session highlight box was not found in the exported page')
sessionBox.enabled = { value: false, isExpression: false }
session.feedbacks = [
	{
		feedbackId: 'session_state',
		options: { state: 'ahead' },
		isInverted: false,
		styleOverrides: [
			{ elementId: sessionBox.id, elementProperty: 'enabled', override: expressionValue(true) },
			{ elementId: sessionBox.id, elementProperty: 'color', override: expressionValue(0x4bb824) },
		],
	},
	{
		feedbackId: 'session_state',
		options: { state: 'behind' },
		isInverted: false,
		styleOverrides: [
			{ elementId: sessionBox.id, elementProperty: 'enabled', override: expressionValue(true) },
			{ elementId: sessionBox.id, elementProperty: 'color', override: expressionValue(0xe02020) },
		],
	},
]

const serializedLayouts = JSON.stringify(layouts, null, '\t')
	.replaceAll('"decoration": "border"', '"decoration": ButtonGraphicsDecorationType.Border')
	.replaceAll('"showStatusIcons": "default"', '"showStatusIcons": ButtonGraphicsShowStatusIcons.FollowDefault')

const generated =
	`// Generated from design-assets/preset-layout.json. Do not edit by hand.\n` +
	`import { ButtonGraphicsDecorationType, ButtonGraphicsShowStatusIcons, type CompanionLayeredButtonPresetDefinition } from '@companion-module/base'\n` +
	`import type { ModuleSchema } from './main.js'\n\n` +
	`export type LayeredPresetLayout = Pick<CompanionLayeredButtonPresetDefinition<ModuleSchema>, 'canvas' | 'elements' | 'feedbacks'>\n\n` +
	`export const LAYERED_PRESET_LAYOUTS: Record<string, LayeredPresetLayout> = ${serializedLayouts}\n`

await writeFile(outputPath, await format(generated, { ...(await resolveConfig(outputPath)), filepath: outputPath }))
console.log(`Generated ${outputPath} from ${sourcePath}`)
