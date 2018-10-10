
/* jshint esnext:true */

var
	plugin = module.exports = cxl('workspace.watch')
;

plugin.extend({

	uid: 0,
	delay: 250,

	isMatch: function(file, match)
	{
		if (Array.isArray(match))
			return match.find(this.isMatch.bind(this, file));
		else
			return ide.FileMatcher.isMatch(file, match);
	},

	runTasks: function(project, name, tasks, id)
	{
		if (typeof(tasks)!=='string')
			return cxl.each(tasks, this.runTasks.bind(this, project, name));

		id = id || tasks;
	var
		hint = {
			id: 'watch' + (this.uid++),
			className: 'warn',
			title: `Task: ${id}`,
			code: 'watch:' + name,
			progress: -1
		}
	;
		project.notify(hint);
		project.exec(tasks, { plugin: plugin })
			.then(function() {
				hint.className = 'success';
				hint.title = 'Task successfully executed';
			}, function(e) {
				hint.className = 'error';
				hint.title = 'Error: ' + e;
			}).then(function() {
				hint.progress = 1;
				project.notify(hint);
			});
	},

	onFileChange: function(project, ev)
	{
	var
		me = this,
		file = ev.filename,
		config = project.configuration.watch,
		rules
	;
		if (!config)
			return;

		rules = Array.isArray(config) ? config : config.rules;

		this.dbg(`File ${file} changed.`);

		cxl.each(rules, function(rule, name) {
			if (me.isMatch(file, rule.files))
			{
				if (!rule.fn)
					rule.fn = cxl.debounce(me.runTasks.bind(me, project, rule.name || name, rule.tasks), me.delay);

				rule.fn();
			}
		});

	}

}).run(function() {

	ide.plugins.on('project.filechange', this.onFileChange.bind(this));

});
