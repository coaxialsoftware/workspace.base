const { build, typescript } = require('../../cxl/dist/build');

build({
	outputDir: '.',
	tasks: [
		typescript({
			input: 'worker.ts',
			output: 'worker.js'
		})
	]
});
