/**
 * workspace.git
 *
 * GIT Extension
 */
"use strict";

var
	fs = require('fs'),
	_ = workspace._,

	common = workspace.common,
	plugin = module.exports = cxl('workspace.git')
;

plugin.extend({

	onProjectCreate: function(project)
	{
		var c = project.configuration;
		
		if (fs.existsSync(project.path+'/.git'))
		{
			c.tags.git = true;
			c.icons.push({ title: 'git', class:'git' });
		}
	},

	readIgnore: function(project)
	{
		return common.read(project.path + '/.gitignore')
			.then(function(data) {
				var f = data.trim().replace(/[\/\\]$/mg, '').split("\n");
				var ignore = project.configuration.ignore || [];
			
				project.configuration.ignore =
					_.compact(ignore.concat(f));
			}, function() { });
	},

	onProjectLoad: function(project)
	{
		if (project.configuration.tags.git)
		{
			project.ignore.push('.git');
			project.resolve(this.readIgnore(project));
		}
	},
	
	reloadProject: function(project)
	{
		if (project.configuration.tags.git)
			project.reload();
	}

}).config(function() {
	workspace.plugins.on('project.create', this.onProjectCreate.bind(this));
	workspace.plugins.on('project.load', this.onProjectLoad.bind(this));
	workspace.plugins.on('project.filechange:.gitignore', this.reloadProject.bind(this));
});
