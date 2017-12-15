/**
 *
 * workspace.bower
 *
 */
"use strict";

var
	fs = require('fs'),
	plugin = module.exports = cxl('workspace.bower')
;

plugin.config(function() {

	ide.plugins.on('project.create', function(project) {

	var
		pkg,
		config = project.configuration
	;
		try {
			// TODO make async
			pkg = JSON.parse(fs.readFileSync(project.path + '/bower.json'));
		} catch(e) { return; }

		if (pkg)
		{
			config.tags.bower = 'bower';
			config.name = config.name || pkg.name;
			config.version = config.version || pkg.version;
			config.description = config.description || pkg.description;
		}

	});

	ide.plugins.on('project.load', function(project) {
		if (project.configuration.tags.bower)
			project.ignore.push('bower_components');
	});

});
