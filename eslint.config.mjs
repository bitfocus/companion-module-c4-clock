import { generateEslintConfig } from '@companion-module/tools/eslint/config.mjs'

export default [
	...(await generateEslintConfig({ enableTypescript: true, ignores: ['.tools/**'] })),
	{
		files: ['scripts/**/*.mjs', 'test/**/*.mjs'],
		// Build/test helpers intentionally import development tools and compiled fixtures.
		rules: { 'n/no-unpublished-import': 'off' },
	},
]
