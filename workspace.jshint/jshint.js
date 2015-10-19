
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
				f: file.id, $: version, js: e.getValue()
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
		f = this.files[data.e]
	;
		if (f.version===data.$)
		{
			this.updateHints(f.editor, data.errors);
			f.editor.jshint = data; 
			delete this.files[data.e];
		}
	},
	
	findFunction: function(editor, token, hints)
	{
	var
		line = token.line+1,
		ch = token.ch,
		data = editor.jshint,
		fn
	;
		if (!data)
			return;
		
		fn = _.findLast(data.functions, function(fn) {
			return (line===fn.line && ch>=fn.character || line > fn.line) &&
				(line===fn.last && ch <= fn.lastcharacter || line < fn.last);
		});
		
		if (fn)
			hints.push({
				code: 'jshint:function',
				title: fn.name +
					'(' + (fn.param ? fn.param.join(', ') : '') + ')',
				tags: [ 'complexity:' + fn.metrics.complexity ]
			});
	},
	
	onAssist: function(done, editor, token)
	{
		var hints;
		
		if (editor && editor.hints && token)
		{
			hints = editor.hints.getLine('jshint', token.line).map(function(h) {
				return { code: 'jshint', title: h.title,
					className: h.className, priority: 5 };
			});
			
			this.findFunction(editor, token, hints);
			
			if (hints.length)
				done(hints);
		}
	},
	
	ready: function()
	{
		this.files = {};
		this.listenTo('socket.message.jshint', this.onMessage)
			.listenTo('editor.change', this.getHints)
			.listenTo('editor.load', this.getHints)
			.listenTo('assist', this.onAssist)
		;
	}
	
});
	
ide.plugins.register('jshint', plugin);
	
})(this.ide, this._);
