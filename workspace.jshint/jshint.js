
(function(ide, cxl) {
"use strict";
	
function findFunctionAtCursor(line, ch, functions)
{
var
	l = functions.length, fn
;
	while (l--)
	{
		fn = functions[l];
		
		if ((line===fn.line && ch>=fn.character || line > fn.line) &&
			(line===fn.last && ch <= fn.lastcharacter || line < fn.last))
			return fn;
	}
}
	
var worker = new ide.Worker({
	
	findFunctionAtCursor: findFunctionAtCursor,
	
	findFunctionByPos: function(data)
	{
		return this.findFunctionAtCursor(data.row, data.column, data.functions);
	},
	
	findFunctionByName: function(data) {
	var
		functions = data.functions,
		token = data.token
	;
		if (token && functions && functions.find(function(fn) {
			return fn.name===token;
		}))
			return { title: 'Go to definition', action: 'ijump' };
	},
	
	findFunction: function(data)
	{
	var
		fn = this.findFunctionByPos(data),
		def = this.findFunctionByName(data),
		hints = []
	;
		if (fn)
			hints.push({
				code: 'jshint:function',
				title: fn.name +
					'(' + (fn.param ? fn.param.join(', ') : '') + ')',
				tags: [ 'complexity:' + fn.metrics.complexity ]
			});
		
		if (def)
			hints.push(def);
		
		return hints.length && hints;
	}
	
});

var plugin = new ide.Plugin({

	delay: 250,

	data: null,
	
	editorCommands: {
		
		ijump: {
			description: 'Jump to definition of identifier',
			fn: function()
			{
			var
				token = ide.editor.token.current,
				jshint = ide.editor.__jshint,
				fn = token && jshint.functions.find(function(f) {
					return f.name===token.value;
				})
			;
				if (fn)
					ide.editor.cursor.go(fn.line, fn.character);
				else
					return ide.Pass;
			}
		},
		
		jshint: {
			fn: function() {
				var e = ide.editor, file = e.file, version;

				if (file && (e.mode==='text/javascript' ||
					e.mode==='application/json') && e.hints)
				{
					version = Date.now();

					ide.socket.send('jshint', {
						editor: e.id, p: ide.project.id, op: 'lint',
						f: file.id, $: version, js: file.diff()
					});
				}
			},
			description: 'Run jshint for current editor'
		}
		
	},

	fix: function()
	{
	var
		editor = ide.editor, token = editor.token,
		hints, str='', file=editor.file
	;
		if (editor && editor.hints && token && file)
		{
			hints = editor.hints.getLine('jshint', token.line);
			
			hints.forEach(function(h) {
				if (h.evidence && h.evidence.length>str.length)
					str=h.evidence;
			});
			
			ide.socket.send('jshint',
				{ op: 'fix', js: str, p: ide.project.id, f: file.id });
		}
	},

	updateHints: function(editor, errors)
	{
		editor.hints.clear('jshint');

		if (errors)
		{
			editor.header.setTag('jshint', '<span title="jshint: ' +
				errors.length + ' errors(s) found.">jshint</span>', 'error');
			
			errors.forEach(function(e) {
				if (e)
					editor.hints.add('jshint', {
						line: e.line,
						ch: e.character,
						className: e.id==='(error)' ? 'error' : 'warn',
						length: e.evidence && e.evidence.length,
						title: e.reason,
						evidence: e.evidence
					});
			});
			
		} else
			editor.header.setTag('jshint', undefined, 'hidden');
		
		ide.assist.requestHints();
	},

	onMessage: function(data)
	{
	var
		editor = ide.workspace.find(data.e)
	;
		if (editor.hints)
			this.updateHints(editor, data.errors);
		
		editor.__jshint = data;
	},

	onAssist: function(done, editor, token)
	{
		var hints, data;

		if (editor && editor.hints && token)
		{
			data = editor.__jshint;
			
			hints = editor.hints.getLine('jshint', token.row).map(function(h) {
				return { code: 'jshint', title: h.title,
					className: h.className, priority: 5 };
			});
			
			if (data)
			{
				worker.post('findFunction', {
					row: token.row+1, column: token.column, functions: data.functions,
					token: token.value
				}, done);
			}

			if (hints.length)
				done(hints);
		}
	},

	onAssistInline: function(done, editor, token)
	{
	var
		data = editor.__jshint,
		fn = token && data && findFunctionAtCursor(token.row+1, token.column, data.functions),
		str = token.value,
		hints,
		globals = data && data.globals,
		p, index
	;
		if (!data || !str)
			return;
		
		hints = [];
		
		if (token.type==='variable' && fn && fn.param)
			fn.param.forEach(function(h) {
				if (h.indexOf(str)===0)
					hints.push({ title: h, icon: 'variable' });
			});

		if (token.type==='variable' && globals)
			globals.forEach(function(g) {
				if (g.indexOf(str)===0)
					hints.push({ title: g, icon: 'variable-global' });
			});
		else if (token.type==='property' && data.member)
		{
			for (p in data.member)
				if ((index = p.indexOf(str))!==-1)
					hints.push({ title: p, icon: 'property', priority: index+5 });
		}

		if (hints.length)
			done(hints);
	},

	ready: function()
	{
		this.listenTo('socket.message.jshint', this.onMessage)
			.listenTo('assist', this.onAssist)
			.listenTo('assist.inline', this.onAssistInline)
		;
	}

});

ide.plugins.register('jshint', plugin);

})(this.ide, this.cxl);
