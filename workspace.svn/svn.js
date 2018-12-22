
(function(ide) {
"use strict";

ide.resources.registerSVGIcon('svn', '<path fill="#809CC8" d="M103-68V-.9C170.6-29 277.9-54.6 350.1-68H103zm256 14.3C209.6-31.5 92.4 21.4 228.5 9.4 277.9 5 315 0 359-2.7v-51zm-74.9 85.2c-42.4.5-123.3 12-181.1 15.2v54.5C284.2 74.7 347.6 32 284.1 31.5zM359 50.6c-72.7 28.5-186 55.8-256 66.4v.5h256V50.6zM116.3 65.5c-1.1 2.6-5 1.6-4.8-1.2.1-3.7 6.5-2.5 4.8 1.2zm6.3 1.5c-3.2-.1-3.2-5 .2-5 3.4 0 3 5.3-.2 5zm-6.2 12.8c.8 2.8-2.9 4.5-4.4 2.2-2.3-3.2 3.3-5.7 4.4-2.2zm7.8 2.7c-3.7 2.8-6.1-4.6-1.4-4.4 2.3 0 3.3 3.1 1.4 4.4z"/>', '103 -68 256 106');

ide.plugins.register('svn', new ide.Plugin({

	commands: {

		/*'svn.log': {
			fn: function(file)
			{
				file = file || (ide.editor && ide.editor.file);

				var
					me = this,
					editor, id
				;

				if (!file)
					return;

				id = file instanceof ide.File ? file.get('filename') : file;

				editor = new ide.Editor.List({
					title: 'svn log ' + id,
					file: id,
					plugin: 'svn.svnLog',
					onItemClick: function(ev, item)
					{
						me.svnCat(file, item.rev);
					}
				});

				cxl.ajax.get('/svn/log?p=' + ide.project.id + '&f=' + id, function(res) {
					editor.add(res);
				});

				return editor;
			},
			help: 'Display commit log messages'
		},

		'svn.up': {
			fn: function(o)
			{
				var editor = new ide.Editor.FileList({
					title: 'svn up',
					slot: o.slot,
					plugin: 'svn.svnUp'
				});
				cxl.ajax.post('/svn/up?p=' + ide.project.id, function(res) {
					editor.add(res.files);
					editor.set('html', 'Revision ' + res.revision);
				});

				return editor;
			},
			help: 'Update your working copy'
		},
*/
		'svn.resolve': {
			fn: function()
			{
				if (ide.editor && ide.editor.file)
					cxl.ajax.post('/svn/resolve?f=' + ide.editor.file.path);
			},
			icon: 'svn',
			help: 'Resolve file with working revision'
		}

	},

	svnCat: function(file, rev)
	{
		var id = file instanceof ide.File ? file.id : file;

		cxl.ajax.get('/svn/cat?f=' + id + '&rev=' + rev, function(res) {
			ide.open(new ide.File(res));
		});
	}

}));

})(this.ide);