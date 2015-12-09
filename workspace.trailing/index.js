
"use strict";

var
	fs = require('fs'),
	_ = workspace._,
	common = workspace.common,
	plugin = module.exports = cxl('workspace.trailing')
;

plugin.extend({


	REGEX: /[ \t]+$/gm,

	mimeTypes: [
		'application/javascript'
	],

	onFileWrite: function(file)
	{
		if (file.content && this.mimeTypes.indexOf(file.mime)!==-1)
		{
			file.content = file.content.replace(this.REGEX, '');
		}
	}

}).run(function() {
	workspace.plugins.on('file.beforewrite', this.onFileWrite.bind(this));
});