
var
	jshint = require('jshint').JSHINT,
	path = require('path'),
	fs = require('fs'),

	common = workspace.common,
	plugin = module.exports = cxl('workspace.jshint')
;

plugin.extend({

	sourcePath: __dirname + '/jshint.js',

	findOptions: function(p, f)
	{
	var
		dir = f ? path.dirname(f) : p,
		file = dir + '/.jshintrc', data
	;
		if (!fs.existsSync(file) && f)
		{
			file = p + '/.jshintrc';
			if (!fs.existsSync(file))
				file = false;
		}

		if (file)
		{
			this.dbg(`Using ${file} as config.`);

			try { data = JSON.parse(fs.readFileSync(file, 'utf8')); }
			catch(e) {
				this.dbg('Coult not read jshintrc file.');
			}
			finally {
				return data;
			}
		}
	},

	doLint: function(client, options, data, js)
	{
		jshint(js, options, options && options.globals);

		var payload = jshint.data();

		payload.$ = data.$;
		payload.e = data.editor;

		workspace.socket.respond(client, 'jshint', payload);

		return payload;
	},

	lintFile: function(client, data)
	{
	var
		options = this.findOptions(data.p, data.f)
	;
		common.readFile(data.f)
			.then(this.doLint.bind(this, client, options, data));
	},

	/**
	 * data: { $:id, p:project, f:path, js:code }
	 */
	onMessage: function(client, data)
	{
		if (data.op==='lint')
			this.operation(`Linting file ${data.f}`, this.lintFile.bind(this, client,data));
	},

	onAssist: function(done, data)
	{
		var hints, payload, options, row;

		if (!(data.fileChanged &&
			(data.mime ==='application/json' || data.mime==='application/javascript')))
			return;

		options = this.findOptions(data.project, data.file);
		payload = this.doLint(data.client, options, data, data.content);

		if (payload.errors && data.token)
		{
			row = data.token.row+1;

			hints = payload.errors.filter(function(e) {
				return e && e.line === row;
			}).map(function(e) {
				return { code: 'jshint', title: e.reason,
					className: e.id==='(error)' ? 'error' : 'warn', priority: 5 };
			});

			done(hints);
		}
	}

}).run(function() {

	workspace.plugins.on('assist', this.onAssist.bind(this));
	workspace.plugins.on('socket.message.jshint', this.onMessage.bind(this));

});
