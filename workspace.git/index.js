/**
 * workspace.git
 *
 * GIT Extension
 */
'use strict';

const fs = require('fs'),
	path = require('path'),
	plugin = (module.exports = cxl('workspace.git')),
	REGEX_BLAME = /author (.+)$[\s\S]+author-time (.+)[\s\S]+summary (.+)/m,
	STATUS_CODE = {
		M: 'Modified',
		A: 'Added',
		D: 'Deleted',
		R: 'Renamed',
		C: 'Copied',
		U: 'Updated'
	};
function execRequest(req, res, cmd) {
	const project = ide.projectManager.getProject(req.body.project),
		file = req.body.file || '';
	return ide.ServerResponse.respond(res, project.exec(cmd));
}

function onAssist(req) {
	const token = req.features.token,
		file = req.features.file,
		project = req.project;

	if (
		req.extended &&
		token &&
		file &&
		file.path &&
		!file.changed &&
		token.row
	) {
		const filePath = path.relative(project.path, file.path),
			row = token.row + 1;

		project
			.exec(`git blame -p -L${row},${row} ${filePath}`, {
				ignoreError: true
			})
			.then(
				res => {
					if (!res) return;
					const m = REGEX_BLAME.exec(res),
						date = new Date(parseInt(m[2]) * 1000);
					req.respondExtended([
						{
							code: 'git.blame',
							tags: [date],
							title: m[1],
							description: m[3]
						}
					]);
				},
				() => {}
			);
	}
}

plugin
	.extend({
		sourcePath: __dirname + '/git.js',

		onProjectCreate(project) {
			var c = project.configuration;

			if (fs.existsSync(project.path + '/.git')) {
				c.tags.git = '<ide-icon title="git" class="git"></ide-icon>';
			}
		},

		parseIgnore(project, data) {
			const // remove comments and empty lines
				f = data
					.trim()
					.replace(/(?:[\/\\]$)|^[#].*$/gm, '')
					.split('\n'),
				ignore = project.configuration.ignore;
			//f.forEach(i => i.charAt(0)==='!' ? ignore.include(i) : ignore.push(i));
			f.forEach(i => i && ignore.push(i));
		},

		readIgnore(project) {
			return cxl.file
				.read(project.path + '/.gitignore', 'utf8')
				.then(this.parseIgnore.bind(this, project), function() {});
		},

		onGitChange(project, ev) {
			if (!ev || ev.path.includes('.git/HEAD'))
				return cxl.file
					.read(project.path + '/.git/HEAD', 'utf8')
					.then(contents =>
						project.configuration.set('git.head', contents)
					);
		},

		onProjectChange(project, event) {
			if (event.relativePath === '.gitignore')
				this.readIgnore(project).then(() => project.reload());
		},

		onProjectLoad(project) {
			project.resolve(this.readIgnore(project));

			if (project.configuration.tags.git) {
				project.configuration.ignore.push('.git');
				project.resolve(this.onGitChange(project));
				project.resources.add(
					ide.DirectoryWatch.create(
						project.path + '/.git'
					).subscribe(ev => this.onGitChange(project, ev))
				);
			}
		},

		server: cxl('workspace').server
	})
	.route('GET', '/git/log', function(req, res) {
		var file = req.query.f,
			project = req.query.p,
			cmd = `cd ${project} && git log --pretty=format:%H%n%an%n%ai%n%f ${file}`,
			m,
			result = [];
		const REGEX = /(.+)\n(.+)\n(.+)\n(.+)/gm;

		function parse(res) {
			while ((m = REGEX.exec(res))) {
				result.push({
					hash: m[1],
					tags: [m[3]],
					code: m[2],
					title: m[4]
				});
			}
			return result;
		}

		ide.ServerResponse.respond(
			res,
			ide
				.exec(cmd, {
					plugin: this,
					maxBuffer: 1028000
				})
				.then(parse),
			this
		);
	})
	.route('GET', '/git/show', function(req, res) {
		var file = req.query.f,
			project = req.query.p,
			rev = req.query.h,
			cmd = `cd ${project} && git show ${rev}:${file}`;
		ide.ServerResponse.respond(
			res,
			ide.exec(cmd, { plugin: this }).then(function(content) {
				return { content: content, mime: ide.File.mime(file) };
			}),
			this
		);
	})
	.route('GET', '/git/status', function(req, res) {
		var project = ide.projectManager.getProject(req.query.p),
			cmd = `git status --porcelain -uno --verbose`,
			REGEX = /(.)(.) (.+)/gm,
			m,
			result = [],
			tag;
		function parse(content) {
			while ((m = REGEX.exec(content))) {
				tag = STATUS_CODE[m[2]] || STATUS_CODE[m[1]];
				result.push({
					title: m[3],
					tags: tag && [tag]
				});
			}

			return result;
		}

		ide.ServerResponse.respond(
			res,
			project.exec(cmd, { plugin: this }).then(parse),
			this
		);
	})
	.route('GET', '/git/pull', function(req, res) {
		var project = ide.projectManager.getProject(req.query.p),
			cmd = 'git pull';
		ide.ServerResponse.respond(
			res,
			project.exec(cmd, { plugin: this }),
			this
		);
	})
	.route('POST', '/git/clone', function(req, res) {
		var project = ide.projectManager.getProject(req.body.project),
			repo = req.body.repository,
			cmd = `git clone ${repo}`;
		ide.ServerResponse.respond(
			res,
			project.exec(cmd, { plugin: this }),
			this
		);
	})
	.route('POST', '/git/diff', function(req, res) {
		var project = ide.projectManager.getProject(req.body.project),
			file = req.body.file || '',
			cmd = `git diff ${file}`;
		ide.ServerResponse.respond(
			res,
			project
				.exec(cmd, { plugin: this }, this)
				.then(content => ({ content: content }))
		);
	})
	.route('POST', '/git/checkout', (req, res) => {
		execRequest(req, res, `git diff ${req.body.file}`);
	})
	.config(function() {
		ide.plugins.on('project.create', this.onProjectCreate.bind(this));
		ide.plugins.on('project.load', this.onProjectLoad.bind(this));
		ide.plugins.on('project.filechange', this.onProjectChange.bind(this));
		ide.plugins.on('assist', onAssist);
	});
