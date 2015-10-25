
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
	
	lintFile: function(client, data)
	{
	var
		me = this,
		options = me.findOptions(data.p, data.f),
		js
	;
		fs.readFile(data.f, 'utf8', function(err, file) {
			
			if (err)
				file = '';
			
			js = common.patch(file, data.js);
			jshint(js, options, options && options.globals);
			
			var payload = jshint.data();

			payload.$ = data.$;
			payload.e = data.editor;

			workspace.socket.respond(client, 'jshint', payload);

			if (payload.errors)
				payload.errors.forEach(function(e) {
					if (e)
						me.error(`${e.line}:${e.character} ${e.reason}`);
				});
		});
	},
	
	/**
	 * data: { $:id, p:project, f:path, js:code }
	 */
	onMessage: function(client, data)
	{
		this.operation(`Linting file ${data.f}`, this.lintFile.bind(this, client,data));
	},
	
	onAssist: function(done, data)
	{
		if (!(data.fileChanged &&
			(data.mime ==='application/json' || data.mime==='application/javascript')))
			return;
		
		var options = this.findOptions(data.project, data.file);
		
		jshint(data.content, options, options && options.globals);

		var payload = jshint.data();
		payload.$ = data.$;
		payload.e = data.editor;
		
		workspace.socket.respond(data.client, 'jshint', payload);

		if (payload.errors)
			payload.errors.forEach(function(e) {
				if (e)
					this.error(`${e.line}:${e.character} ${e.reason}`);
			}, this);
	}
	
}).run(function() {
	
	workspace.plugins.on('assist', this.onAssist.bind(this));
	
});
