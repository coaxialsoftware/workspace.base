
(function(ide) {

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
		}

	},

	updateHints: function(editor, errors)
	{
		editor.hints.clear('jshint');

		if (errors)
		{
			editor.header.setTag('jshint', '<span title="jshint: ' +
				errors.length + ' error(s) found.">jshint:' + errors.length + '</span>', 'error');

			errors.forEach(function(e) {
				if (e)
					editor.hints.add({
						code: 'jshint',
						range: { column: e.character, row: e.line-1 },
						className: e.id==='(error)' ? 'error' : 'warn',
						title: e.reason
					});
			});

		} else
			editor.header.setTag('jshint', '');
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

	onAssist: function(request)
	{
		var data, editor=request.editor, token=request.features.token;

		if (editor && token)
		{
			data = editor.__jshint;

			if (data)
			{
				if (request.extended)
					worker.post('findFunction', {
						row: token.row+1, column: token.column, functions: data.functions,
						token: token.value
					}, request.respondExtended.bind(request));

				this.onAssistInline(request, data);
			}

		}
	},

	getHints: function(list, term, hints, icon)
	{
		var i=0, l=list.length, p, index;

		for (;i<l;i++)
		{
			p = list[i];
			if ((index = p.indexOf(term))!==-1)
				hints.push(this.getHintDef(p, icon, index, term.length));
		}
	},

	getHintDef: function(title, icon, index, length)
	{
		return {
			code: 'jshint',
			title: title, icon: icon, priority: index+5,
			matchStart: index, matchEnd: index+length
		};
	},

	onAssistInline: function(request, data)
	{
	var
		token = request.editor.token.current,
		fn = token && findFunctionAtCursor(token.row+1, token.column, data.functions),
		str = token.cursorValue,
		hints,
		globals = data.globals,
		p, index
	;
		if (!str)
			return;

		hints = [];

		if (token.type==='variable' && fn && fn.param)
			this.getHints(fn.param, str, hints, 'variable');

		if (token.type==='variable' && globals)
			this.getHints(globals, str, hints, 'variable-global');
		else if (token.type==='property' && data.member)
		{
			for (p in data.member)
				if ((index = p.indexOf(str))!==-1)
					hints.push(this.getHintDef(p, 'property', index, str.length));
		}

		if (hints.length)
			request.respondInline(hints);
	},

	ready: function()
	{
		this.resources(worker);
		this.listenTo('socket.message.jshint', this.onMessage)
			.listenTo('assist', this.onAssist)
			.listenTo('assist.inline', this.onAssistInline)
		;
	}

});

ide.plugins.register('jshint', plugin);

})(this.ide);
