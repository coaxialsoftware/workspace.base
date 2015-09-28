/**
 * workspace.Shell
 */
"use strict";

var
	plugin = module.exports = cxl('workspace.shell')
;

plugin.extend({
	sourcePath: __dirname + '/shell.js'
}).config(function() {

	this.server = workspace.server;

}).route('POST', '/shell', function(req, res) {
var
	process
;
	if (!req.body.c)
		return res.send(this.error('Invalid command.'));

	process = workspace.shell(req.body.c, req.body.q, req.body.p, res);
});
