
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
					return;

				editor = new ide.ListEditor({
					title: 'git log: ' + file,
					plugin: this
				});

				cxl.ajax.get('/git/log', { f: file, p: ide.project.id }).then(function(res) {
					editor.add(res);
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
		}
	},

	gitShow: function(file, rev)
	{
		cxl.ajax.get('/git/show?f=' + file + '&h=' + rev + '&p=' + ide.project.id,
			function(res) {
				ide.open(new ide.File(res));
			});
	}
	
}));


})(this.ide);