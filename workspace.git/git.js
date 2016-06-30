
(function(ide, $) {
"use strict";

ide.plugins.register('git', new ide.Plugin({

	commands: {
		git: [
			{ cmd: 'status', fn: 'gitStatus', help: 'Show the working tree status' },
			{ cmd: 'log @file', fn: 'gitLog', help: 'Show history for path' },
			//{ cmd: 'commit', fn: 'gitCommit', help: 'Record changes to the repository' }
			{ cmd: 'pull', fn: 'gitPull', help: 'Fetch from and integrate with another repository' }
		]
	},

	gitShow: function(file, rev)
	{
		$.get('/git/show?f=' + file + '&h=' + rev + '&p=' + ide.project.id,
			function(res) {
				ide.open(new ide.File(res));
			});
	},
	
	gitPull: function()
	{
		$.get('/git/pull', { p: ide.project.id }, function(res) {
			ide.open(new ide.File({ content: res }));
		});
	},

	gitStatus: function(options)
	{
	var
		editor = new ide.Editor.FileList({
			slot: options.slot,
			title: 'git status',
			plugin: 'git.gitStatus'
		})
	;
		$.get('/git/status', { p: ide.project.id }, function(res) {
			editor.add(res);
		});

		return editor;
	},

	gitLog: function(options)
	{
	var
		me = this,
		file = options.file || ide.editor && ide.editor.file && ide.editor.file.get('filename'),
		editor
	;
		if (!file)
			return;

		editor = new ide.Editor.List({
			slot: options.slot,
			title: 'git log: ' + file,
			file: file,
			plugin: 'git.gitLog',
			onItemClick: function(ev, item)
			{
				me.gitShow(file, item.hash);
			}
		});

		$.get('/git/log', { f: file, p: ide.project.id }, function(res) {
			editor.add(res);
		});

		return editor;
	}

}));

})(this.ide, this.jQuery);