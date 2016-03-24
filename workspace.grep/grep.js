(function(ide, $, _, undefined) {
"use strict";

var
	GREP_REGEX = /^(?:\.\/)?(.+):(\d+):\s*(.+)\s*/,
	ITEM_TEMPLATE = _.template('<button class="item" data-id="<%= obj.id %>">' +
		'<h4><%- obj.filename%>:<%= obj.line %></h4>' +
		'<pre><%- obj.match %></pre></button>')
;

function grepDone(editor, result)
{
var
	i = 0, match, files = [], ignore = ide.project.ignoreRegex
;
	result = result.split("\n");

	for (; i<result.length; i++)
	{
		match = GREP_REGEX.exec(result[i]);
		if (match && (!ignore || !ignore.test(match[1])))
			files.push({
				line: match[2], filename: match[1], match: match[3] });
	}

	editor.add(files);
}

ide.plugins.register('grep', {
	
	commands: {
		grep: function(param)
		{
			return this.open({ plugin: this, file: param });
		}
	},
	
	open: function(options)
	{
		if (!options.file)
			return;
	var
		pos = 0,
		term = options.file,
		exclude = ide.project.get('ignore'),
		args = [],
		env = ide.project.get('env'),

		editor
	;
		options.itemTemplate = ITEM_TEMPLATE;
		options.title = 'grep ' + term;
		
		editor = new ide.Editor.FileList(options);

		args.push('-0rnIP');

		if (exclude instanceof Array)
			exclude.forEach(function(f) {
				var d = f.replace(/ /g, '\\ ').replace(/\/$/, '');
				args.push('--exclude-dir=' + d + '',
					'--exclude=' + d);
			});

		// Fix for linux?
		args.push(term, env && env.WINDIR ? '*' : '.');

		ide.post('/grep', { q: args, p: ide.project.id }, function(a)
		{
			var eol = a.target.responseText.lastIndexOf("\n") || a.loaded;

			grepDone(editor, a.target.responseText.slice(pos, eol));
			pos = eol+1;
		}).then(function(text) {
			grepDone(editor, text.slice(pos));
			if (editor.files.length===0)
				editor.$content.html('<div style="text-align:center">' +
					'No matches found.</div>');
		});

		return editor;
	}
	
});
	
})(this.ide, this.jQuery, this._);