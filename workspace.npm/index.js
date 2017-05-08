/**
 *
 * workspace.npm
 *
 */
"use strict";

var
	plugin = module.exports = cxl('workspace.npm'),
	NPM_OPTIONS = {
		'"name"': { description: 'Package Name' },
		'"version"': { description: 'Package Version' },
		'"description"': { description: 'Package Description' },
		'"keywords"': { description: 'Put keywords in it.' },
		'"homepage"': { description: 'The url to the project homepage' },
		'"bugs"': { description: 'Issue tracker URL' },
		'"license"': {},
		'"author"': {},
		'"contributors"': {},
		'"files"': {},
		'"main"': {},
		'"bin"': {},
		'"man"': {},
		'"directories"': {},
		'"repository"': {},
		'"scripts"': {},
		'"config"': {},
		'"dependencies"': {},
		'"devDependencies"': {},
		'"peerDependencies"': {},
		'"bundledDependencies"': {},
		'"optionalDependencies"': {},
		'"engines"': {},
		'"engineStrict"': {},
		'"os"': {},
		'"cpu"': {},
		'"preferGlobal"': {},
		'"private"': {},
		'"publishConfig"': {}
	}
;

class NPMLanguageServer extends workspace.LanguageServer {
	
	onInlineAssist(done, data)
	{
		var result;
		
		if (data.token.type==='string property')
		{
			result = this.findObject(NPM_OPTIONS, data.token.cursorValue, Object.assign);

			if (result.length)
				done(result);
		}
	}
	
}

plugin.config(function() {
	
	for (var i in NPM_OPTIONS)
		NPM_OPTIONS[i].icon = 'npm';

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
	
	this.$ls = new NPMLanguageServer('npm', /application\/json/, /package\.json/);
});
