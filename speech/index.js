"use strict";

const
	plugin = module.exports = cxl('workspace.speech')
;

plugin.extend({

	sourcePath: __dirname + '/speech.js',

	settings: {
		"speech.voice": {
			exposed: true
		}
	}

});
