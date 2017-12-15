/**
 * workspace.git
 *
 * GIT Extension
 */
"use strict";

var
	fs = require('fs'),

	plugin = module.exports = cxl('workspace.git'),

	STATUS_CODE = {
		M: 'Modified',
		A: 'Added'
	}
;

plugin.extend({

	sourcePath: __dirname + '/git.js',

	onProjectCreate: function(project)
	{
		var c = project.configuration;

		if (fs.existsSync(project.path+'/.git'))
		{
			c.tags.git = '<ide-icon title="git" class="git"></ide-icon>';
		}
	},

	readIgnore: function(project)
	{
		return cxl.file.read(project.path + '/.gitignore', 'utf8')
			.then(function(data) {
				var f = data.trim().replace(/[\/\\]$/mg, '').split("\n");
				var ignore = project.configuration.ignore;

				cxl.pushUnique(ignore, f);
			}, function() { });
	},

	onProjectLoad: function(project)
	{
		if (project.configuration.tags.git)
			project.configuration.ignore.push('.git');

		project.resolve(this.readIgnore(project));
	},

	reloadProject: function(project)
	{
		if (project.configuration.tags.git)
			project.reload();
	},

	server: cxl('workspace').server

}).route('GET', '/git/log', function(req, res) {
var
	file = req.query.f,
	project = req.query.p,
	cmd = `cd ${project} && git log --pretty=format:%H%n%an%n%ai%n%f ${file}`,
	m, result = []
;
	const REGEX = /(.+)\n(.+)\n(.+)\n(.+)/gm;

	function parse(res)
	{
		while ((m = REGEX.exec(res))) {
			result.push({
				hash: m[1], tags: [ m[3] ], code: m[2], title: m[4]
			});
		}
		return result;
	}

	ide.ServerResponse.respond(res, ide.exec(cmd, {
		plugin: this, maxBuffer: 1028000 }).then(parse), this);

}).route('GET', '/git/show', function(req, res) {
var
	file = req.query.f,
	project = req.query.p,
	rev = req.query.h,
	cmd = `cd ${project} && git show ${rev}:${file}`
;
	ide.ServerResponse.respond(
		res,
		ide.exec(cmd, { plugin: this }).then(function(content) {
			return { content: content, mime: ide.File.mime(file) };
		}),
		this
	);

}).route('GET', '/git/status', function(req, res) {
var
	project = ide.projectManager.getProject(req.query.p),
	cmd = `git status --porcelain -uno --verbose`,
	REGEX = /(.)(.) (.+)/gm,
	m, result = [], tag
;
	function parse(content)
	{
		while ((m = REGEX.exec(content))) {
			tag = STATUS_CODE[m[2]] || STATUS_CODE[m[1]];
			result.push({
				title: m[3], tags: tag && [ tag ]
			});
		}

		return result;
	}

	ide.ServerResponse.respond(res, project.exec(cmd, { plugin: this })
		.then(parse), this);

}).route('GET', '/git/pull', function(req, res) {
var
	project = ide.projectManager.getProject(req.query.p),
	cmd = 'git pull'
;
	ide.ServerResponse.respond(res, project.exec(cmd, { plugin: this }), this);
}).route('POST', '/git/clone', function(req, res) {
var
	project = ide.projectManager.getProject(req.body.project),
	repo = req.body.repository,
	cmd = `git clone ${repo}`
;
	ide.ServerResponse.respond(res, project.exec(cmd, { plugin: this }), this);
}).route('POST', '/git/diff', function(req, res) {
var
	project = ide.projectManager.getProject(req.body.project),
	file = req.body.file || '',
	cmd = `git diff ${file}`
;
	ide.ServerResponse.respond(res, project.exec(cmd, { plugin: this }, this).then(function(content) {
		return { content: content };
	}));

}).config(function() {
	ide.plugins.on('project.create', this.onProjectCreate.bind(this));
	ide.plugins.on('project.load', this.onProjectLoad.bind(this));
	ide.plugins.on('project.filechange:.gitignore', this.reloadProject.bind(this));
});
