const { build, tsconfig, pkg } = require('../../cxl/dist/build');

build({
	outputDir: '../dist/typescript',
	tasks: [tsconfig(), pkg()]
});
