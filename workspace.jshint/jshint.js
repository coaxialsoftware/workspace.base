
(function(ide, _) {
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
		return this.findFunctionAtCursor(data.line, data.ch, data.functions);
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
		
		ijump: [ {
			help: 'Jump to definition of identifier',
			fn: function()
			{
			var
				token = ide.editor.token,
				jshint = ide.editor.__jshint,
				fn = token && _.find(jshint.functions, { name: token.string })
			;
				if (fn)
					ide.editor.go(fn.line, fn.character);
				else
					return ide.Pass;
			}
		} ]
		
	},

	commands: {

		jshint: [
			{ fn: 'getHints', help: 'Run jshint for current editor', editor: true },
			{ cmd: 'fix', fn: 'fix', help: 'Fix current line jshint error', editor: true }
		]

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

	getHints: function()
	{
		var e = ide.editor, file = e.file, version;

		if (file && (e.mode==='text/javascript' ||
			e.mode==='application/json') && e.hints)
		{
			version = Date.now();

			ide.socket.send('jshint', {
				e: e.id, p: ide.project.id, op: 'lint',
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
						title: e.reason,
						evidence: e.evidence
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

	onAssist: function(done, editor, token)
	{
		var hints, data;

		if (editor && editor.hints && token)
		{
			data = editor.__jshint;
			
			hints = editor.hints.getLine('jshint', token.line).map(function(h) {
				return { code: 'jshint', title: h.title,
					className: h.className, priority: 5 };
			});
			
			if (data)
			{
				worker.post('findFunction', {
					line: token.line+1, ch: token.ch, functions: data.functions,
					token: token.string
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
		fn = token && data && findFunctionAtCursor(token.line, token.ch, data.functions),
		str = token.string,
		hints = [],
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
		this.listenTo('socket.message.jshint', this.onMessage)
			.listenTo('assist', this.onAssist)
			.listenTo('assist.inline', this.onAssistInline)
		;
	}

});

ide.plugins.register('jshint', plugin);

})(this.ide, this._);
