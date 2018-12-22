
/* jshint node:true, esnext:true */
/* global ide, cxl */
"use strict";

var
	fs = require('fs'),
	cp = require('child_process'),
	path = require('path'),

	plugin = module.exports = cxl('workspace.svn'),

	STATUS_REGEX = /(.{9})\s+([^\s]+)\s+([^\s]+)\s+([^\s]+)\s+(.+)$/gm,
	REVISION_REGEX = /revision:\s+(.+)$/m,
	SVNLOG_REGEX = /-+\s+([^\s]+)[\s|]+([^\s]+)[\s|]+([^|]+).+\s+(.+)/gm,
	SVNUP_REGEX = /^(\w)\s+(.+)/gm
;

plugin.extend({

	sourcePath: __dirname + '/svn.js',

	// Default interval. use svn.interval in project.json to override
	interval: 60000,

	parseRevision: function(project, status)
	{
	var
		current = project.__svnRevision,
		m = REVISION_REGEX.exec(status)
	;
		project.__svnRevision = m && m[1];

		if (current && current !== project.__svnRevision)
		{
			this.log(`New revision ${project.__svnRevision} for ${project.path}`);

			project.notify({
				code: 'svn', title: 'Updates available.', className: 'warn',
				tags: [ 'rev:' + project.__svnRevision ]
			});
		}
	},

	parseStatus: function(project, status)
	{
	var
		result = {}, m, p
	;
		while ((m = STATUS_REGEX.exec(status)))
		{
			p = path.normalize(m[5]);
			result[p] = {
				file: p,
				revision: m[2],
				outOfDate: m[1].charAt(8)==='*',
				user: m[4]
			};
		}

		project.__svnStatus = result;

		this.timeout = null;
	},

	checkStatus: function(project, full)
	{
		this.dbg(`Checking status ${project.path}`);

		ide.exec(`svn status -u -v --non-interactive ${project.path}`,
			{ plugin: this })
			.bind(this)
			.then(function(stdout) {
				this.parseStatus(project, stdout);
				this.parseRevision(project, stdout);
			})
		;
	},

	onProjectCreate: function(project)
	{
		var c = project.configuration;

		if (fs.existsSync(project.path+'/.svn'))
			c.tags.svn = 'svn';
	},

	onWatch: function(project)
	{
		if (this.timeout)
			clearTimeout(this.timeout);

		this.checkStatus(project, true);
	},

	onProject: function(project)
	{
		var c = project.configuration;

		if (c.tags.svn && project.hasPlugin('svn'))
		{
			ide.fileWatcher.observeFile(path.join(project.path, '/.svn'), this.onWatch.bind(this, project));
			this.checkStatus(project, true);
		}
	},

	scheduleUpdate: function(project)
	{
		if (this.timeout)
			return;

		var delay = project.configuration['svn.interval'] || this.interval;

		this.timeout = setTimeout(this.checkStatus.bind(this, project), delay);
	},

	onAssist: function(request)
	{
	var
		project = request.project,
		svn = project.__svnStatus,
		file = svn && svn[request.features.file.path],
		tags
	;
		if (!file)
			return;

		tags = [ 'rev:' + file.revision, file.user ];

		if (file.outOfDate)
			tags.push('<i class="fa fa-exclamation-triangle" title="Out of Date"></i>');

		// Schedule Update only if project is active
		this.scheduleUpdate(project);

		request.respondExtended({
			code: 'svn',
			tags:  tags,
			className: file.outOfDate ? 'warn' : 'info',
			priority: file.outOfDate ? 5 : 10
		});
	},

	server: cxl('workspace').server

}).route('GET', '/svn/log', function(req, res) {
var
	file = req.query.f,
	cmd = `svn log ${file}`,
	p = ide.projectManager.getProject(req.query.p)
;
	function parse(res)
	{
		var result = [], m;

		while ((m = SVNLOG_REGEX.exec(res)))
		{
			result.push({ code: m[2], tags: [ m[1] ], title: m[4], rev: m[1] });
		}
		return result;
	}

	ide.ServerResponse.respond(
		this, res,
		p.exec(cmd, { plugin: this }).then(parse)
	);

}).route('GET', '/svn/cat', function(req, res) {
var
	file = req.query.f,
	rev = req.query.rev,
	cmd = `svn cat -r ${rev} ${file}`
;
	ide.ServerResponse.respond(
		this, res,
		ide.exec(cmd, { plugin: this }).then(function(content) {
			return { content: content, mime: ide.File.getMime(file) };
		})
	);

}).route('POST', '/svn/up', function(req, res) {
var
	p = req.query.p,
	project = ide.projectManager.getProject(p),
	cmd = `svn up --non-interactive ${project.path}`, m
;
	function parse(res)
	{
	var
		rev = /revision (\d+)\.$/m.exec(res),
		result = { files: [], revision: rev && rev[1] }
	;
		while ((m = SVNUP_REGEX.exec(res))) {
			result.files.push({ title: m[2], icons: [ { text: m[1] } ] });
		}

		return result;
	}

	ide.ServerResponse.respond(this, res, ide.exec(cmd, { plugin: this }).then(parse));

}).route('POST', '/svn/resolve', function(req, res) {
var
	filename = req.query.f,
	cmd = `svn resolve ${filename} --accept=working`
;

	ide.ServerResponse.respond(res, ide.exec(cmd, { plugin: this }), this);

}).run(function() {

	ide.plugins.on('project.create', this.onProjectCreate.bind(this));
	ide.plugins.on('project.load', this.onProject.bind(this));
	ide.plugins.on('assist', this.onAssist.bind(this));

});
