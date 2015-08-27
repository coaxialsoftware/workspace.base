
var
	fs = require('fs'),

	plugin = module.exports = cxl('workspace.vim'),
	dir = __dirname
;

plugin.extend({
	sourcePath: dir+'/vim.js'
});
