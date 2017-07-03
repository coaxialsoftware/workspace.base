
(function(ide, cxl) {
"use strict";

var
	SHELL_ID = 1
;

/**
 * Calls shell service and returns a Promise.
 */
function shell(cmd, args)
{
	return cxl.ajax.post(
		'/shell',
		{ c: cmd, q: Array.prototype.slice.call(args, 0), p: ide.project.get('path') }
	);
}

function shellSuccess(cmd, args)
{
	return shell(cmd, args).then(function() {
		ide.notify({ code: 'shell', title: cmd + ' success.' });
	});
}

class Shell extends ide.Editor {

	constructor(p)
	{
		super(p);

		this.shellId = SHELL_ID++;
	}

}

ide.plugins.register('shell', new ide.Plugin({

	commands: {

		shell: {
			fn: function()
			{
				return new Shell({ plugin: this, title: 'shell' });
			},
			description: 'Opens shell'
		},

		mkdir: {
			fn: function()
			{
				return shellSuccess('mkdir', arguments);
			},
			description: 'Create directory'
		},

		mv: {
			fn: function()
			{
				return shellSuccess('mv', arguments);
			},
			description: 'Move Files'
		},

		cp: {
			fn: function()
			{
				return shellSuccess('cp', arguments);
			},
			description: 'Copy Files'
		},
		
		ls: {
			fn: function() { ide.open('.'); },
			description: "list files in current directory"
		}

	}


}));

})(this.ide, this.cxl);