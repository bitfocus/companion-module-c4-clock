import { Regex, type SomeCompanionConfigField } from '@companion-module/base'

export const DEFAULT_WEB_PORT = 44044

export type ModuleConfig = {
	host: string
	port: number
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'textinput',
			id: 'host',
			label: 'C4 Clock App IP',
			width: 8,
			default: '127.0.0.1',
			regex: Regex.HOSTNAME,
		},
		{
			type: 'number',
			id: 'port',
			label: 'Web Control Port',
			width: 4,
			min: 1,
			max: 65535,
			default: DEFAULT_WEB_PORT,
		},
		{
			type: 'static-text',
			id: 'web_port_help',
			label: 'Match C4 Clock',
			width: 12,
			value:
				"Use the port shown in C4 Settings > Web Display. New C4 setups default to 44044; existing setups may still use 8080 or a custom port. Changing C4's web port also requires updating this connection.",
		},
	]
}
