import type ModuleInstance from './main.js'

export type VariablesSchema = {
	connection: string
	timer: string
	timer_colour: number
	timer_text_colour: number
	timer_label: string
	run_state: string
	play_pause: string
	output_mode: string
	active_ppt: string
	active_ppt_label: string
	ppt1_label: string
	ppt2_label: string
	ppt3_label: string
	ppt4_label: string
	slide: string
	current_slide: string
	total_slides: string
	slides_left: string
	section_name: string
	section_slides_left: string
	session_delta: string
	ends_label: string
	ends_at: string
	pace: string
	pace_eta: string
	flash_state: string
	arm_label: string
	arm_state: string
	media_remaining: string
	media_state: string
	media_duration: string
	next_media_warning: string
	preset_1_label: string
	preset_2_label: string
	preset_3_label: string
	preset_4_label: string
	preset_5_label: string
	preset_6_label: string
}

export function UpdateVariableDefinitions(self: ModuleInstance): void {
	self.setVariableDefinitions({
		connection: { name: 'Connection status' },
		timer: { name: 'Countdown time' },
		timer_colour: { name: 'Live C4 timer colour (RGB number)' },
		timer_text_colour: { name: 'Contrasting text for the live C4 timer colour (RGB number)' },
		timer_label: { name: 'Current presenter/title' },
		run_state: { name: 'Timer state' },
		play_pause: { name: 'Play/Pause button label' },
		output_mode: { name: 'Active output mode' },
		active_ppt: { name: 'Active PowerPoint source number' },
		active_ppt_label: { name: 'Active PowerPoint source label' },
		ppt1_label: { name: 'PowerPoint 1 label' },
		ppt2_label: { name: 'PowerPoint 2 label' },
		ppt3_label: { name: 'PowerPoint 3 label' },
		ppt4_label: { name: 'PowerPoint 4 label' },
		slide: { name: 'Current slide, for example 1/20' },
		current_slide: { name: 'Current slide number' },
		total_slides: { name: 'Total slide count' },
		slides_left: { name: 'Slides left in deck (or section in Single Deck mode)' },
		section_name: { name: 'Current PowerPoint section name' },
		section_slides_left: { name: 'Slides left in current section' },
		session_delta: { name: 'Session over/under time' },
		ends_label: { name: 'Ends At or Over By label' },
		ends_at: { name: 'Countdown ends at time' },
		pace: { name: 'Slide pace' },
		pace_eta: { name: 'Projected slide pace finish time' },
		flash_state: { name: 'Flash time state' },
		arm_label: { name: 'Arm or Auto Arm label' },
		arm_state: { name: 'Arm state' },
		media_remaining: { name: 'Media remaining' },
		media_state: { name: 'Media playback state' },
		media_duration: { name: 'Media duration' },
		next_media_warning: { name: 'Next-slide audio/video warning' },
		preset_1_label: { name: 'Quick preset 1' },
		preset_2_label: { name: 'Quick preset 2' },
		preset_3_label: { name: 'Quick preset 3' },
		preset_4_label: { name: 'Quick preset 4' },
		preset_5_label: { name: 'Quick preset 5' },
		preset_6_label: { name: 'Quick preset 6' },
	})
}
