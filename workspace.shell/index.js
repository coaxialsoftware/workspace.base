
var
	plugin = module.exports = cxl('workspace.shell'),
	WHITELIST = {
		mkdir: true,
		mv: true
	}
;

function getOSShell()
{
	var env = process.env;

	if (process.platform==='win32')
		return env.COMSPEC || 'cmd.exe';

	return env.SHELL || '/bin/sh';
}

plugin.extend({
	sourcePath: __dirname + '/shell.js'
}).config(function() {
	this.server = workspace.server;
}).route('POST', '/shell', function(req, res) {
var
	process, cmd = req.body.c
;
	if (!cmd || !(cmd in WHITELIST))
		return res.status(500).send(this.error('Invalid command.'));

	process = workspace.shell(req.body.c, req.body.q, req.body.p, res);
});
