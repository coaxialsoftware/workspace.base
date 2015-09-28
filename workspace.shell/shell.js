
(function(ide, $, _, undefined) {
"use strict";

/**
 * Calls shell service and returns a Promise.
 */
function shell(cmd, args, onprogress)
{
	return ide.post(
		'/shell', 
		{ c: cmd, q: args, p: ide.project.get('path') },
		onprogress
	);
}

function cmd(name, args, onprogress)
{
	args = Array.prototype.slice.call(args, 0);
	shell(name, args, onprogress)
		.then(function(response) {
			var file = new ide.File({ filename: '', content: response });
		
			ide.open({ file: file });
		})
	;
}
	
ide.plugins.register('shell', new ide.Plugin({

	commands: {
		
		shell: function(cmd)
		{
			var args = Array.prototype.slice.call(arguments, 1);
			cmd(cmd, args);
		},

		mkdir: function()
		{
			shell('mkdir', Array.prototype.slice.call(arguments, 0))
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