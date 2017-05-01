
(function(ide, cxl) {
"use strict";

/**
 * Calls shell service and returns a Promise.
 */
function shell(cmd, args)
{
	return cxl.ajax.post(
		'/shell',
		{ c: cmd, q: args, p: ide.project.get('path') }
	);
}

/*function cmd(name, args, onprogress)
{
	args = Array.prototype.slice.call(args, 0);
	shell(name, args, onprogress)
		.then(function(response) {
			var file = new ide.File({ filename: '', content: response });

			ide.open({ file: file });
		})
	;
}*/

ide.plugins.register('shell', new ide.Plugin({

	commands: {

		mkdir: {
			fn: function()
			{
				shell('mkdir', Array.prototype.slice.call(arguments, 0))
					.then(ide.notify.bind(this, { code: 'shell', title: 'mkdir success.' }));
			},
			
			description: 'Create directory'
		}

	}


}));

})(this.ide, this.cxl);