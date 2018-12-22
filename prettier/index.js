
"use strict";

const
	prettier = require('prettier')
;

module.exports = cxl('workspace.prettier').extend({

	onFileWrite(file)
	{
		if (file.content)
		{
			return prettier.getFileInfo(file.path)
				.then(info => {
					return info.inferredParser && prettier.resolveConfig(file.path)
						.then(options => {
							if (!options)
								return;
						const
							str = file.content.toString(),
							newStr = prettier.format(str,
								Object.assign({ parser: info.inferredParser }, options))
						;
							if (str !== newStr)
								file.content = Buffer.from(newStr);
						});
				});
		}
	}

}).run(function() {

	ide.plugins.on('file.beforewrite', this.onFileWrite.bind(this));

});