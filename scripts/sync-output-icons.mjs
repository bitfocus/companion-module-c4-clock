import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const icons = {
	blankOverlay: 'blank-overlay.png',
	solidOrange: 'solid-orange.png',
	buttonBorder: 'button-border.png',
	buttonBorderBlack: 'button-border-black.png',
	statusSlidesLeft: 'status-slides-left.png',
	statusSlides: 'status-slides.png',
	statusMedia: 'status-media.png',
	statusMediaActive: 'status-media-active.png',
	statusTime: 'status-time.png',
	statusTimeOrange: 'status-time-orange.png',
	statusTimeRed: 'status-time-red.png',
	statusSession: 'status-session.png',
	previous: 'previous.png',
	next: 'next.png',
	minuteMinus: 'minute-minus.png',
	minutePlus: 'minute-plus.png',
	blackActive: 'output-black-active.png',
	blackInactive: 'output-black-inactive.png',
	countdownActive: 'output-countdown-active.png',
	countdownInactive: 'output-countdown-inactive.png',
	notesActive: 'output-notes-active.png',
	notesInactive: 'output-notes-inactive.png',
	timeActive: 'output-time-active.png',
	timeInactive: 'output-time-inactive.png',
	play: 'play.png',
	pauseActive: 'pause-active.png',
}

const lines = Object.entries(icons).map(([name, file]) => {
	const png64 = readFileSync(join(root, 'design-assets', file)).toString('base64')
	return `\t${name}: '${png64}',`
})

writeFileSync(join(root, 'src', 'output-icons.ts'), `export const OUTPUT_ICONS = {\n${lines.join('\n')}\n} as const\n`)
