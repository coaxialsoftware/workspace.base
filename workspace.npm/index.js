/**
 *
 * workspace.npm
 *
 */
"use strict";

var
	plugin = module.exports = cxl('workspace.npm')
;

plugin.config(function() {

	workspace.plugins.on('project.create', function(project) {

	var
		pkg = workspace.common.load_json_sync(project.path + '/package.json'),
		config = project.configuration,
		links
	;

		if (pkg)
		{
			config.tags.npm = 'npm';
			config.name = config.name || pkg.name;
			config.version = config.version || pkg.version;
			config.description = config.description || pkg.description;
			config.license = config.license || pkg.license;
			
			links = [];
			
			if (pkg.homepage)
				links.push({
					href: pkg.homepage, class: 'home', title: 'Homepage' });
			if (pkg.repository)
				links.push({
					href: pkg.repository.url, class: 'database', title: 'Repository' });
			if (pkg.bugs)
				links.push({
					href: pkg.bugs.url || pkg.bugs, class: 'bug', title: 'Bug Tracker' });
					
			config.icons = config.icons ? config.icons.concat(links) : links;
		}

	});
	
	workspace.plugins.on('project.load', function(project) {
		if (project.configuration.tags.npm)
			project.ignore.push('node_modules');
	});

});
