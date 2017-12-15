/**
 * workspace.dragdrop
 *
 * Drag and Drop functionality
 *
 */
ide.plugins.register('dragdrop', new ide.Plugin({

	$dest: null,

	on_dragover: function(ev)
	{
		ev.preventDefault();
		ev.dataTransfer.dropEffect = 'copy';

		var dest = '';

		if (ev.ctrlKey)
			dest = this.findDestination(ev.target);

		this.$entered = true;

		if (dest !== this.$dest)
		{
			this.$dest = dest;
			this.updateHint(ev.dataTransfer.items, ev.ctrlKey, dest);
		}
	},

	updateHint: function(items, ctrl, dest)
	{
		this.$hint = ide.notify({
			id: 'dragdrop',
			code: 'dragdrop',
			title: 'Dragging ' + items.length + ' items' + (dest ? ' to "' + dest + '"' : '') +
				'. Hold ctrl to upload.',
			progress: 0
		});
	},

	on_readfile: function(file, ev)
	{
		var newFile = new ide.File(file.name);
		newFile.content = ev.target.result;
		ide.open({ file: newFile });

		this.onEnd();
	},

	upload: function(file, ev)
	{
		var newFile = new ide.File(this.$dest + file.name);

		function upload()
		{
			ide.notify({
				className: 'success',
				title: `Successfully uploaded file to ${newFile.name}`
			});

			return newFile.write(ev.target.result);
		}

		this.onEnd();

		return newFile.read().then(() => {

			if (!newFile.stat.isNew)
				return ide.confirm({ message: 'File exists. Overwrite?'}).then(upload);

			return upload();
		});
	},

	findEditor: function(el)
	{
		var editor;

		do {
			editor = el.$editor;
			el = el.parentNode;
		} while (el && !editor);

		return editor;
	},

	findDestination: function(el)
	{
	var
		editor = this.findEditor(el),
		dir = ''
	;
		if (editor && editor.file && editor.file.stat.isDirectory)
			dir = editor.file.name + '/';

		return dir;
	},

	on_drop: function(ev)
	{
	var
		files = ev.dataTransfer.files,
		i = 0, reader
	;
		ev.preventDefault();

		for (; i < files.length; i++)
		{
			reader = new window.FileReader();
			reader.onload = (ev.ctrlKey ? this.upload : this.on_readfile).bind(this, files[i]);
			reader.readAsArrayBuffer(files[i]);
		}
	},

	onEnd: function()
	{
		if (this.$hint)
		{
			ide.logger.remove(this.$hint);
			this.$hint = this.$dest = null;
		}

		this.$entered = false;
	},

	start: function()
	{
		this.listenToElement(window, 'dragover', this.on_dragover.bind(this));
		this.listenToElement(window, 'drop', this.on_drop.bind(this));
		this.listenToElement(window, 'dragleave', this.onEnd.bind(this));
	}

}));
