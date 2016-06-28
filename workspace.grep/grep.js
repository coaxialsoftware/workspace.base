(function(ide, $, _, undefined) {
"use strict";

var
	GREP_REGEX = /^(?:\.\/)?(.+):(\d+):\s*(.+)\s*/
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
				line: match[2],
				value: match[1],
				title: match[1] + ':' + match[2],
				html: '<pre>' + _.escape(match[3]) + '</pre>'
			});
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

		editor = new ide.Editor.FileList({
			file: term,
			title: 'grep ' + term,
			plugin: this, slot: options.slot
		})
	;
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

			if (editor.children.length===0)
				editor.$list.html('<div style="text-align:center">' +
					'No matches found.</div>');
		});

		return editor;
	}

});

})(this.ide, this.jQuery, this._);