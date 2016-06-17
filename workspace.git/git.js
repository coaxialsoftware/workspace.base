
(function(ide, $) {
"use strict";

ide.plugins.register('git', new ide.Plugin({

	editorCommands: {

		git: function(cmd)
		{
			var file = ide.editor.file;

			if (cmd==='log' && file instanceof ide.File)
				return this.gitLog({ file: file.get('filename') });

			return ide.Pass;
		},

		git2: [
			{ cmd: 'log ?file', fn: 'gitLog', help: 'Show history for path' }
		]

	},

	commands: {

		git2: [
			{ cmd: 'status', fn: 'gitStatus', help: 'Show the working tree status' }
			//{ cmd: 'commit', fn: 'gitCommit', help: 'Record changes to the repository' }
		],

		git: function(cmd)
		{
			if (cmd==='status')
				return this.gitStatus({});

			return ide.Pass;
		}
	},

	gitShow: function(file, rev)
	{
		$.get('/git/show?f=' + file + '&h=' + rev + '&p=' + ide.project.id,
			function(res) {
				ide.open(new ide.File(res));
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
		file = options.file,
		editor = new ide.Editor.List({
			slot: options.slot,
			title: 'git log: ' + file,
			file: file,
			plugin: 'git.gitLog',
			onItemClick: function(ev, item)
			{
				me.gitShow(file, item.hash);
			}
		})
	;
		$.get('/git/log', { f: file, p: ide.project.id }, function(res) {
			editor.add(res);
		});

		return editor;
	}

}));

})(this.ide, this.jQuery);