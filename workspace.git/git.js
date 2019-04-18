(ide => {
"use strict";

const
	HEAD_REGEX = /.+\/(.+)/
;

ide.File.registerIconProvider(file => {
	if (file.name==='.gitignore')
		return 'git';
});

ide.plugins.register('git', {

	icon: 'git',

	onProjectLoad()
	{
		this.updateState();
	},

	updateState()
	{
	const
		head = HEAD_REGEX.exec(ide.project.get('git.head')),
		branch = this.activeBranch = head && head[1]
	;
		if (branch)
			this.hint.tags = [ '<ide-icon class="branch"></ide-icon> ' + branch ];

		if (!ide.assist.panel.visible && this.activeBranch!==branch)
		{
			ide.notify({ code: 'git', title: 'Switched to branch ' + this.activeBranch});
			this.activeBranch = branch;
		}
	},

	ready()
	{
		this.hint = new ide.DynamicItem({ code: 'git' });
		this.updateState();
		ide.plugins.on('project.load', this.onProjectLoad, this);
		ide.assist.addPermanentItem(this.hint);
	},

	commands: {

		'git.status': {
			fn()
			{
				var editor = new ide.ListEditor({
					title: 'git status', plugin: this, itemClass: ide.FileItem
				});

				cxl.ajax.get('git/status?p=' + ide.project.id).then(function(res) {
					editor.add(res);
				}, function(err) {
					editor.add([
						{ className: 'error', action: null, title: err.error, icon: 'error' }
					]);
				});

				return editor;
			},
			description: 'Show the working tree status'
		},

		'git.log': {
			fn(file)
			{
				var editor;

				file = file || ide.editor && ide.editor.file && ide.editor.file.name;

				if (!file)
					return new ide.Notification({
						code: 'git', title: 'git.log: No file specified',
						className: 'error'
					});

				editor = new ide.ListEditor({
					title: 'git log: ' + file,
					arguments: [ file ],
					plugin: this
				});

				function enter(r)
				{
					ide.run('git.show', [ file, r.hash ]);
				}

				cxl.ajax.get('git/log', { f: file, p: ide.project.id }).then(function(res) {
					editor.add(res.map(function(r) {
						r.enter = enter.bind(null, r);
						r.tags[0] = (new Date(r.tags[0])).toLocaleString();
						return r;
					}));
				});

				return editor;
			},
			description: 'Show history for path'
		},
		'git.pull': {
			fn()
			{
				return cxl.ajax.get('git/pull', { p: ide.project.id }).then(function(res) {
					ide.open(new ide.File(null, res));
				});
			},
			description: 'Fetch from and integrate with another repository'
		},
		'git.diff': {
			fn(file)
			{
				file = file || ide.editor && ide.editor.file && ide.editor.file.name;

				return cxl.ajax.post('git/diff', { project: ide.project.id, file: file })
					.then(res => ide.open(new ide.File(null, res.content, 'text/x-diff')))
					.then(editor => { editor.command = 'git.diff'; });
			},
			description: 'Show changes between commits, commit and working tree, etc'
		},
		'git.show': {
			fn(file, rev)
			{
				file = file || ide.editor && ide.editor.file && ide.editor.file.name;

				if (!file)
					return new ide.Notification({
						code: 'git', title: 'git.show: No file specified',
						className: 'error'
					});

				return cxl.ajax.get('git/show?f=' + file + '&h=' + rev + '&p=' + ide.project.id)
					.then(res => ide.open(new ide.File(null, res.content, res.mime)))
					.then(editor => {
						editor.command = 'git.show';
						editor.arguments = [ file, rev ];
					});
			},
			description: 'Show various types of objects'
		}
	}

});

})(this.ide);