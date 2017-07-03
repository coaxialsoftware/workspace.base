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
			project.configuration.ignore.push('.git');

		project.resolve(this.readIgnore(project));
	},

	reloadProject: function(project)
	{
		if (project.configuration.tags.git)
			project.reload();
	},

	server: workspace.server

}).route('GET', '/git/log', function(req, res) {
var
	file = req.query.f,
	project = req.query.p,
	cmd = `cd ${project} && git log --pretty=format:%H%n%an%n%ai%n%f ${file}`,
	REGEX = /(.+)\n(.+)\n(.+)\n(.+)/gm,
	m, result = []
;
	function parse(res)
	{
		while ((m = REGEX.exec(res))) {
			result.push({
				hash: m[1], tags: [ m[3] ], code: m[2], title: m[4]
			});
		}
		return result;
	}

	common.respond(this, res, workspace.exec(cmd).then(parse));
}).route('GET', '/git/show', function(req, res) {
var
	file = req.query.f,
	project = req.query.p,
	rev = req.query.h,
	cmd = `cd ${project} && git show ${rev}:${file}`
;
	common.respond(
		this, res,
		workspace.exec(cmd, { plugin: this }).then(function(content) {
			return { content: content, mime: workspace.File.getMime(file) };
		})
	);

}).route('GET', '/git/status', function(req, res) {
var
	project = workspace.projectManager.getProject(req.query.p),
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

	common.respond(this, res, project.exec(cmd, { plugin: this })
		.then(parse));

}).route('GET', '/git/pull', function(req, res) {
var
	project = workspace.projectManager.getProject(req.query.p),
	cmd = 'git pull'
;
	common.respond(this, res, project.exec(cmd, { plugin: this }));
}).route('POST', '/git/clone', function(req, res) {
var
	project = workspace.projectManager.getProject(req.body.project),
	repo = req.body.repository,
	cmd = `git clone ${repo}`
;
	common.respond(this, res, project.exec(cmd, { plugin: this }));
}).route('POST', '/git/diff', function(req, res) {
var
	project = workspace.projectManager.getProject(req.body.project),
	file = req.body.file || '',
	cmd = `git diff ${file}`
;
	common.respond(this, res, project.exec(cmd, { plugin: this }).then(function(content) {
		return { content: content };
	}));

}).config(function() {
	workspace.plugins.on('project.create', this.onProjectCreate.bind(this));
	workspace.plugins.on('project.load', this.onProjectLoad.bind(this));
	workspace.plugins.on('project.filechange:.gitignore', this.reloadProject.bind(this));
});
