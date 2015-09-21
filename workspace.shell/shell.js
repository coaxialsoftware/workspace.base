
(function(ide, $, _, undefined) {
"use strict";

var
	GREP_REGEX = /^(?:\.\/)?(.+):(\d+):\s*(.+)\s*/,
	ITEM_TEMPLATE = _.template('<div class="item">' +
		'<button class="item-content" data-id="<%= obj.id %>">' +
		'<strong><%- obj.filename%></strong>:<%= obj.line %>' +
		'<pre><%- obj.match %></pre></button></div>')
;

/**
 * Calls shell service and returns a Promise.
 */
ide.shell = function(cmd, args, onprogress)
{
	return $.ajax({
		url: '/shell',
		data: JSON.stringify({ c: cmd, q: args, p: ide.project.get('path') }),
		contentType: 'application/json',
		type: 'POST',
		xhr: function()
		{
			var xhr = $.ajaxSettings.xhr();
			if (onprogress)
	            xhr.addEventListener('progress', onprogress);
	        return xhr;
		}
	}).fail(function(xhr) {
		ide.error(xhr.responseText);
	});
};

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

function cmd(name, args, onprogress)
{
	args = Array.prototype.slice.call(args, 0);
	ide.shell(name, args, onprogress)
		.then(function(response) {
			ide.open({
				file: name + ' ' + args.join(' '),
				content: response, mime: 'text/plain',
				new: true
			});
		})
	;
}
	
ide.plugins.register('shell.grep', {
	
	commands: {
		grep: function(param)
		{
			return this.open({ plugin: this, params: param });
		}
	},
	
	open: function(options)
	{
		if (!options.params)
			return;
	var
		pos = 0,
		term = options.params,
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

		ide.shell('grep', args, function(a)
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

ide.plugins.register('shell', new ide.Plugin({

	commands: {

		mkdir: function()
		{
			ide.shell('mkdir', Array.prototype.slice.call(arguments, 0))
				.then(ide.notify.bind(this, "[shell] mkdir success."));
		},

		svn: function()
		{
			cmd('svn', arguments);
		},

		git: function()
		{
			cmd('git', arguments);
		},

		grunt: function()
		{
			cmd('grunt', arguments);
		}

	}


}));

})(this.ide, this.jQuery, this._);