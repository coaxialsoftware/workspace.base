
(function(ide, $) {
"use strict";

ide.plugins.register('git', new ide.Plugin({
	
	editorCommands: {
		
		git: function(cmd)
		{
			var file = ide.editor.file;
			
			if (file instanceof ide.File && cmd==='log')
				return this.gitLog({ file: file.get('filename') });
		}
		
	},
	
	gitShow: function(file, rev)
	{
		$.get('/git/show?f=' + file + '&h=' + rev + '&p=' + ide.project.id,
			function(res) {
				ide.open(new ide.File(res));
			});
	},
	
	gitLog: function(options)
	{
	var
		me = this,
		file = options.file,
		editor = new ide.Editor.List({
			slot: options.slot,
			title: 'git log: ' + file,
			file: 'log ' + file,
			plugin: this,
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
	},
	
	open: function(options)
	{
		var cmd = options.file;

		if (cmd.indexOf('log ')===0)
		{
			options.file = options.file.substr(4);
			return this.gitLog(options);
		}
	}

}));

})(this.ide, this.jQuery);