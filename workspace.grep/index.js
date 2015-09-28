/**
 * workspace.Shell
 */
"use strict";

var
	plugin = module.exports = cxl('workspace.grep')
;

plugin.extend({
	sourcePath: __dirname + '/grep.js'
}).config(function() {

	this.server = workspace.server;

}).route('POST', '/grep', function(req, res) {
	workspace.shell('grep', req.body.q, req.body.p, res);
});
