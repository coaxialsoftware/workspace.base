
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
		var file = path.dirname(f) + '/.jshintrc', data;

		if (!fs.existsSync(file))
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

	fixFile: function(client, data)
	{
	/*var
		op = this.findOptions(data.p, data.f) || {},
		fix = fixmyjs.fix(data.js, op)
	;
		console.log(fix);*/
	},

	/**
	 * data: { $:id, p:project, f:path, js:code }
	 */
	onMessage: function(client, data)
	{
		if (data.op==='lint')
			this.operation(`Linting file ${data.f}`, this.lintFile.bind(this, client,data));
		else if (data.op==='fix')
			this.operation(`Fixing file ${data.f}`, this.fixFile.bind(this, client, data));
	},

	onAssist: function(done, data)
	{
		if (!(data.fileChanged &&
			(data.mime ==='application/json' || data.mime==='application/javascript')))
			return;

		var options = this.findOptions(data.project, data.file);
		this.doLint(data.client, options, data, data.content);
	}

}).run(function() {

	workspace.plugins.on('assist', this.onAssist.bind(this));
	workspace.plugins.on('socket.message.jshint', this.onMessage.bind(this));

});
