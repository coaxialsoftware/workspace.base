
"use strict";

var
	plugin = module.exports = cxl('workspace.trailing')
;

plugin.extend({


	REGEX: /[ \t]+$/gm,

	mimeTypes: [
		'application/javascript',
		'text/javascript',
		'application/json'
	],

	onFileWrite(file)
	{
		var str, newStr;

		if (file.content && this.mimeTypes.includes(file.mime))
		{
			// TODO use proper encoding
			str = file.content.toString();
			newStr = str.replace(this.REGEX, '');

			if (newStr !== str)
				file.content = Buffer.from(newStr);
		}
	}

}).run(function() {
	ide.plugins.on('file.beforewrite', this.onFileWrite.bind(this));
});