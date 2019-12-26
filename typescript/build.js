const { build, tsconfig } = require('../../cxl/dist/build');

build({
	outputDir: '../dist/typescript',
	tasks: [tsconfig()]
});
