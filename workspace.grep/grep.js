(function(ide, cxl) {
"use strict";

const GREP_REGEX = /^(?:\.\/)?(.+):(\d+):\s*(.+)\s*/;

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
			files.push(new ide.FileItem({
				line: match[2],
				value: match[1],
				title: match[1] + ':' + match[2],
				description: '<pre>' + cxl.escape(match[3]) + '</pre>'
			}));
	}

	editor.add(files);
}

ide.plugins.register('grep', {

	commands: {
		grep(term)
		{
			if (!term)
				return;
		var
			pos = 0,
			exclude = ide.project.get('ignore'),
			args = [],
			env = ide.project.get('env'),

			editor = new ide.ListEditor({
				title: 'grep ' + term,
				plugin: this
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

			editor.$footer.innerHTML = '<cxl-progress></cxl-progress>';

			cxl.ajax({
				url: '/grep',
				method: 'POST',
				data: { q: args, p: ide.project.id },
				progress: function(a)
				{
					var eol = a.target.responseText.lastIndexOf("\n") || a.loaded;

					grepDone(editor, a.target.responseText.slice(pos, eol));
					pos = eol+1;
				}
			}).then(function(text) {
				grepDone(editor, text.slice(pos));
				editor.$footer.innerHTML = editor.children.length===0 ?
					'<div>No matches found.</div>' : '';
			}, function(err) {
				editor.$footer.innerHTML = '<div>' + err.responseText + '</div>';
			});

			return editor;
		}
	}

});

})(this.ide, this.cxl);
