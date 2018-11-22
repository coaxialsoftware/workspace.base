(function(ide, cxl) {
"use strict";

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

class Shell extends ide.Terminal {

	$onResize()
	{
		super.$onResize();

		if (this.pid)
			ide.socket.notify('shell', 'resize', {
				pid: this.pid, columns: this.$term.cols, rows: this.$term.rows
			});
	}

	$onConnect(result)
	{
		if (result.pid!==this.pid)
		{
			this.pid = result.pid;
			this.arguments = [ result.pid ];
			this.$term.reset();
			ide.hash.save();
		} else
			// Refresh prompt
			ide.socket.notify('shell', 'in', { key: "\0", pid: this.pid });

		this.$connecting = false;
	}

	connect(pid)
	{
		if (this.$connecting)
			return;

		this.$connecting = true;
		// Make sure pid is numeric
		this.pid = +pid;

		ide.socket.request('shell', 'connect', {
			pid: pid,
			columns: this.$term.cols,
			rows: this.$term.rows,
			cwd: ide.project.id
		}).then(this.$onConnect.bind(this));
	}

	$onSocket(data)
	{
		var event = data.event;

		if (this.pid && data.pid === this.pid && event.data)
			this.$term.write(event.data);
	}

	$onInput(key)
	{
		ide.socket.notify('shell', 'in', { key: key, pid: this.pid });
	}

	$ping()
	{
		if (this.pid)
			this.connect(this.pid);
	}

	quit()
	{
		ide.socket.notify('shell', 'disconnect', { pid: this.pid });
	}

	render(p)
	{
		super.render(p);

		this.listenTo(this.$term, 'data', this.$onInput);
		this.listenTo(ide.plugins, 'socket.message.shell', this.$onSocket.bind(this));
		this.listenTo(ide.plugins, 'socket.ready', this.$ping);
	}

}

class ShellItem extends ide.Item {

	enter()
	{
		// TODO risky
		ide.run('shell', [ this.code ]);
	}

}

class ShellListEditor extends ide.ListEditor {

	loadData()
	{
		if (this.loading)
			return;

		this.reset();
		this.loading = true;

		cxl.ajax.get('/shell/terminal').then(data => {
			this.loading = false;
			this.add(data);
		});
	}

	$onSocket(data)
	{
		if (data.method === 'open' || data.method === 'connect' || data.method === 'close' ||
		   data.method === 'disconnect')
			this.loadData();
	}

	render(p)
	{
		super.render(p);

		// TODO safe?
		this.ItemClass = ShellItem;
		this.loadData = cxl.debounce(this.loadData.bind(this));
		this.loadData();
		this.listenTo(ide.plugins, 'socket.message.shell', this.$onSocket);
	}

}

ide.plugins.register('shell', new ide.Plugin({

	commands: {

		'shell.list': {

			fn()
			{
				return new ShellListEditor({ plugin: this, title: 'shell.list' });
			},
			description: 'Display server messages'

		},

		shell: {
			fn(pid)
			{
				var editor = new Shell({ plugin: this, title: 'shell' });

				editor.connect(pid);

				return editor;
			},
			description: 'Opens shell'
		},

		mkdir: {
			fn()
			{
				return shellSuccess('mkdir', arguments);
			},
			description: 'Create directory'
		},

		mv: {
			fn()
			{
				return shellSuccess('mv', arguments);
			},
			description: 'Move Files'
		},

		cp: {
			fn()
			{
				return shellSuccess('cp', arguments);
			},
			description: 'Copy Files'
		},

		ls: {
			fn() { ide.open('.'); },
			description: "list files in current directory"
		}

	}


}));

})(this.ide, this.cxl);