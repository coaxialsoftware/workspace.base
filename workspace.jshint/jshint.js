
(function(ide, _) {
"use strict";

var plugin = new ide.Plugin({

	delay: 250,

	files: null,
	data: null,

	editorCommands: {

		jshint: function()
		{
			plugin.getHints(ide.editor);
		}

	},

	getHints: function(e)
	{
		var file = e.file, version;

		if (file && (e.mode==='text/javascript' ||
			e.mode==='application/json') && e.hints)
		{
			version = Date.now();

			this.files[e.id] = { editor: e, version: version };
			this.send({
				e: e.id, p: ide.project.id,
				f: file.id, $: version, js: file.diff()
			});
		}
	},

	updateHints: function(editor, errors)
	{
		editor.hints.clear('jshint');

		if (errors)
		{
			ide.notify(errors.length + ' JSHINT error(s) found.', 'error');
			errors.forEach(function(e) {
				if (e)
					editor.hints.add('jshint', {
						line: e.line,
						ch: e.character,
						className: e.id==='(error)' ? 'error' : 'warn',
						length: e.evidence && e.evidence.length,
						title: e.reason
					});
			});
		}
	},

	onMessage: function(data)
	{
	var
		editor = ide.workspace.find(data.e)
	;
		this.updateHints(editor, data.errors);
		editor.__jshint = data;
	},

	findFunction: function(editor, token)
	{
	var
		line = token.line+1,
		ch = token.ch,
		data = editor.__jshint
	;
		if (!data)
			return;

		return _.findLast(data.functions, function(fn) {
			return (line===fn.line && ch>=fn.character || line > fn.line) &&
				(line===fn.last && ch <= fn.lastcharacter || line < fn.last);
		});
	},

	onAssist: function(done, editor, token)
	{
		var hints, fn;

		if (editor && editor.hints && token)
		{
			hints = editor.hints.getLine('jshint', token.line).map(function(h) {
				return { code: 'jshint', title: h.title,
					className: h.className, priority: 5 };
			});

			fn = this.findFunction(editor, token);

			if (fn)
				hints.push({
					code: 'jshint:function',
					title: fn.name +
						'(' + (fn.param ? fn.param.join(', ') : '') + ')',
					tags: [ 'complexity:' + fn.metrics.complexity ]
				});

			if (hints.length)
				done(hints);
		}
	},

	onAssistInline: function(done, editor, token)
	{
	var
		fn = this.findFunction(editor, token),
		str = token.string,
		hints = [],
		data = editor.__jshint,
		globals = data && data.globals
	;
		if (data && fn && fn.param && str)
		{
			fn.param.forEach(function(h) {
				if (h.indexOf(str)===0)
					hints.push({ title: h });
			});

			if (globals)
				globals.forEach(function(g) {
					if (g.indexOf(str)===0)
						hints.push({ title: g, icon: 'globe' });
				});

			if (hints.length)
				done(hints);
		}
	},

	ready: function()
	{
		this.files = {};
		this.listenTo('socket.message.jshint', this.onMessage)
			.listenTo('assist', this.onAssist)
			.listenTo('assist.inline', this.onAssistInline)
		;
	}

});

ide.plugins.register('jshint', plugin);

})(this.ide, this._);
