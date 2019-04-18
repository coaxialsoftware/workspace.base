
var
	jshint = require('jshint').JSHINT,
	path = require('path'),
	fs = require('fs'),

	plugin = module.exports = cxl('workspace.jshint')
;

plugin.extend({

	sourcePath: __dirname + '/jshint.js',

	findOptions(p, f)
	{
	var
		dir = f ? path.dirname(f) : p.path,
		file = dir + '/.jshintrc', data
	;
		if (!fs.existsSync(file) && f)
		{
			file = p.path + '/.jshintrc';
			if (!fs.existsSync(file))
				file = false;
		}

		if (file)
		{
			try { data = JSON.parse(fs.readFileSync(file, 'utf8')); }
			catch(e) {
				this.dbg('Coult not read jshintrc file.');
			}
			finally {
				return data;
			}
		}
	},

	doLint(request,options)
	{
		var js = request.features.file.content;

		jshint(js, options, options && options.globals);

		var payload = jshint.data();

		payload.$ = request.$;
		payload.e = request.editor;

		ide.socket.respond(request.client, 'jshint', payload);

		return payload;
	},

	lintFile(client, data)
	{
	var
		options = this.findOptions(data.p, data.f)
	;
		ide.readFile(data.f)
			.then(this.doLint.bind(this, client, options, data));
	},

	/**
	 * data: { $:id, p:project, f:path, js:code }
	 */
	onMessage(client, data)
	{
		if (data.op==='lint')
			this.operation(`Linting file ${data.f}`, this.lintFile.bind(this, client,data));
	},

	onAssist(request)
	{
		var options, file = request.features.file, mime = file && file.mime;

		if (!(file && file.diffChanged &&
			(mime ==='application/json' || mime==='application/javascript')))
			return;

		options = this.findOptions(request.project, file.path, mime);
		this.doLint(request, options);
	}

}).run(function() {

	ide.plugins.on('assist', this.onAssist.bind(this));
	ide.plugins.on('socket.message.jshint', this.onMessage.bind(this));

});
