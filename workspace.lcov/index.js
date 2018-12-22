var
	plugin = module.exports = cxl('workspace.lcov'),
	lcovParse = require('lcov-parse'),
	path = require('path')
;
/* jshint node:true */
/* jshint esnext:true */

plugin.extend({

	sourcePath: __dirname + '/lcov.js',
	data: {},

	onWatch: function(project, data, ev)
	{
		var me = this;

		if (ev && ev.type==='remove')
			return;

		lcovParse(data.fn, function(err, result) {
			if (err)
				return me.error(err);

			me.dbg(`Parsing ${data.fn}`);

			data.result = {};

			cxl.each(result, function(f) {
				var fn = path.relative(data.wd, path.resolve(data.wd, f.file));
				data.result[fn] = f;
			});
			project.broadcast({}, 'lcov');
		});
	},

	createData: function(id, fn, project)
	{
		var data = this.data[id] = {};

		this.dbg(`Watching ${fn} for project "${id}"`);
		data.fn = fn;
		data.cb = this.onWatch.bind(this, project, data);
		data.wid = ide.FileWatch.create(fn).subscribe(data.cb);
		data.wd = ide.cwd + '/' + project.path;

		this.onWatch(project, data);
	},

	onProjectLoad: function(project)
	{
	var
		id = project.path,
		fn = project.configuration.lcov,
		data = this.data[id]
	;
		if (data)
			data.wid.unsubscribe();

		if (fn)
			this.createData(id, path.join(id, fn), project);
	},

	getData: function(pid, fn)
	{
		var d = this.data[pid];

		return d && d.result && d.result[fn];
	}

}).config(function() {

	this.server = cxl('workspace').server;

}).route('GET', '/lcov', function(req, res) {

	res.send(this.getData(req.query.p, req.query.f));

}).run(function() {

	ide.plugins.on('project.load', this.onProjectLoad.bind(this));

});
