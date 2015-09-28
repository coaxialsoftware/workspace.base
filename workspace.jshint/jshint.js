
(function(ide) {
"use strict";
	
var plugin = new ide.Plugin({
	
	delay: 250,
	
	files: null,
	
	editorCommands: {
		
		jshint: function()
		{
			plugin.getHints(ide.editor);
		}
		
	},
	
	getHints: function(e)
	{
		var file = e.file, version;
		
		if (file && e.mode==='text/javascript' && e.hints)
		{
			version = Date.now();
			
			this.files[e.id] = { editor: e, version: version };
			this.send({
				$: e.id, p: ide.project.id,
				f: file.id, v: version, js: e.getValue()
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
		f = this.files[data.$]
	;
		if (f.version===data.v)
		{
			this.updateHints(f.editor, data.errors);
			delete this.files[data.$];
		}
	},
	
	onAssist: function(done, editor, token)
	{
		var hints;
		
		if (editor && editor.hints && token)
		{
			hints = editor.hints.getLine('jshint', token.line);
			
			if (hints.length)
				done(hints.map(function(h) {
					return { code: 'jshint', title: h.title, className: h.className, priority: 5 };
				}));
		}
	},
	
	ready: function()
	{
		this.files = {};
		this.listenTo('socket.message.jshint', this.onMessage)
			.listenTo('editor.write', this.getHints)
			.listenTo('editor.load', this.getHints)
			.listenTo('assist', this.onAssist)
		;
	}
	
});
	
ide.plugins.register('jshint', plugin);
	
})(this.ide);