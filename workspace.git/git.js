
(function(ide) {
"use strict";

ide.plugins.register('git', new ide.Plugin({

	commands: {
		'git.status': {
			fn: function()
			{
				var editor = new ide.ListEditor({
					title: 'git status', plugin: this, itemClass: ide.FileItem
				});

				cxl.ajax.get('/git/status?p=' + ide.project.id).then(function(res) {
					editor.add(res);
				});

				return editor;
			},
			description: 'Show the working tree status',
			icon: 'git'
		},
		'git.log': {
			fn: function(file)
			{
				var editor;

				file = file || ide.editor && ide.editor.file && ide.editor.file.filename;

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

				cxl.ajax.get('/git/log', { f: file, p: ide.project.id }).then(function(res) {
					editor.add(res.map(function(r) {
						r.enter = enter.bind(null, r);
						r.tags[0] = (new Date(r.tags[0])).toLocaleString();
						return r;
					}));
				});

				return editor;
			},
			description: 'Show history for path',
			icon: 'git'
		},
		'git.pull': {
			fn: function()
			{
				cxl.ajax.get('/git/pull', { p: ide.project.id }, function(res) {
					ide.open(new ide.File({ content: res, new: false }));
				});
			},
			description: 'Fetch from and integrate with another repository',
			icon: 'git'
		},
		'git.diff': {
			fn: function(file)
			{
				cxl.ajax.post('/git/diff', { project: ide.project.id, file: file })
					.then(function(res) {
						ide.open(new ide.File({
							content: res.content, mime: 'text/x-diff'
						}));
					});
			},
			description: 'Show changes between commits, commit and working tree, etc',
			icon: 'git'
		},
		'git.show': {
			fn: function(file, rev)
			{
				file = file || ide.editor && ide.editor.file && ide.editor.file.filename;

				if (!file)
					return new ide.Notification({
						code: 'git', title: 'git.show: No file specified',
						className: 'error'
					});

				cxl.ajax.get('/git/show?f=' + file + '&h=' + rev + '&p=' + ide.project.id)
					.then(function(res) {
						return ide.open({ file: new ide.File(res) });
					}).then(function(editor) {
						editor.command = 'git.show';
						editor.arguments = [ file, rev ];
					});
			},
			description: 'Show various types of objects',
			icon: 'git'
		}
	}

}));


})(this.ide);