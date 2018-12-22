
(function(ide) {

ide.plugins.register('lcov', new ide.Plugin({

	editorCommands: {

		lcov: function()
		{

		}

	},

	onData: function(editor, data)
	{
		function avg(o)
		{
			return (o.hit/o.found*100).toFixed(2) + '%';
		}

		if (data && data.lines && data.lines.details)
		{
			var perc = data.lines.hit/data.lines.found;

			editor.__lcov = data;
			editor.__lcovHint = new ide.Item({
				code: 'lcov',
				title: 'Line: ' + avg(data.lines) +
					' Fn: ' + avg(data.functions) +
					' Br: ' + avg(data.branches),
				priority: 10,
				className: perc >= 0.5 ?
					(perc >= 0.8 ? 'success' : 'warn') : 'error'
			});

			if (editor.supports('hints'))
			{
				editor.hints.clear('lcov');

				data.lines.details.forEach(function(e) {
					if (e.hit)
						editor.hints.add({
							code: 'lcov',
							// TODO is it safe to decrease a line?
							// Maybe add as a setting
							range: { row: e.line-1, column: 0 },
							className: 'success',
							title: 'lcov(hit: ' + e.hit + ')'
						});
					});
			}
		}
	},

	onAssist: function(request)
	{
	var
		editor = request.editor,
		file = editor.file,
		hint = editor && editor.__lcovHint
	;
		if (hint && editor.hints && file && file.hasChanged())
		{
			editor.hints.clear('lcov');
			editor.__lcovHint = null;
		}

		if (hint)
			request.respondExtended(hint);
	},

	getData: function(editor)
	{
		if (editor.supports('file'))
		{
			var fn = editor.file && editor.file.name;

			if (fn && editor.file.hasChanged)
				cxl.ajax.get('/lcov?p=' + ide.project.id + '&f=' + fn)
					.then(this.onData.bind(this, editor));
		}
	},

	onMessage: function()
	{
		var me = this;

		ide.workspace.slots.forEach(function(slots) {
			me.getData(slots.editor);
		});
	},

	onWorkspaceAdd: function(editor)
	{
		this.getData(editor);
	},

	start: function()
	{
		if (ide.project.get('lcov'))
		{
			this.listenTo('socket.message.lcov', this.onMessage.bind(this));
			this.listenTo('workspace.add', this.onWorkspaceAdd.bind(this));
			this.listenTo('assist', this.onAssist.bind(this));
		}
	}

}));

})(this.ide);
