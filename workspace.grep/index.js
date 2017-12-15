/**
 * workspace.Shell
 */
var
	plugin = module.exports = cxl('workspace.grep')
;

plugin.extend({
	sourcePath: __dirname + '/grep.js'
}).config(function() {

	this.server = workspace.server;

}).route('POST', '/grep', function(req, res) {

	var grep = new ide.Process('grep', req.body.q, { cwd: req.body.p });

	new ide.http.StreamResponse(res, grep.stream);
});
