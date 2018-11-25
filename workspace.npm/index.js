/**
 *
 * workspace.npm
 *
 */
"use strict";

var
	fs = require('fs'),

	plugin = module.exports = cxl('workspace.npm'),
	ServerResponse = ide.ServerResponse,
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

class NPMLanguageServer extends ide.LanguageServer {

	onInlineAssist(request)
	{
		var result, token = request.features.token;

		if (token.type==='string property')
		{
			result = ide.assist.findObject(NPM_OPTIONS, token.cursorValue, Object.assign);

			if (result.length)
				request.respondInline(result);
		}
	}

}

plugin.extend({

	sourcePath: __dirname + '/npm.js',

	npmList: function(project)
	{
		return ide.NPM.doNpm('list', null, project.path).catch(function(e) {
			return e.data;
		});
	},

	npmView: function(pkg, project)
	{
		return ide.NPM.doNpm('view', pkg && [ [ pkg ] ], project.path );
	},

	npmInstall: function(pkg, project)
	{
		return ide.NPM.doNpm('install', pkg && [ [ pkg ]], project);
	}

}).config(function() {

	for (var i in NPM_OPTIONS)
		NPM_OPTIONS[i].icon = 'npm';

	ide.plugins.on('project.create', function(project) {
	var
		config = project.configuration,
		links, pkg
	;
		try {
			// TODO make async
			pkg = JSON.parse(fs.readFileSync(project.path + '/package.json'));
		} catch(e) { return; }

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

	ide.plugins.on('project.load', function(project) {
		if (project.configuration.tags.npm)
			project.files.ignore('node_modules');
	});

	this.$ls = new NPMLanguageServer('npm', /application\/json/, /package\.json/);
	this.server = cxl('workspace').server;

}).route('GET', '/npm/list', function(req, res) {
	var p = ide.projectManager.getProject(req.query.p);

	ServerResponse.respond(res, this.npmList(p), this);
}).route('GET', '/npm/view', function(req, res) {
	var p = ide.projectManager.getProject(req.query.p);

	ServerResponse.respond(res, this.npmView(req.query.package, p), this);
}).route('POST', '/npm/install', function(req, res) {
	ServerResponse.respond(res, this.npmInstall(req.body.package, req.body.project), this);
});
