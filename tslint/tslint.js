
ide.plugins.register('tslint', {

	commands: {
		'tslint.config': {
			fn: () =>
			{
				return ide.open({
					file: cxl.ajax.get('/tslint/config?p=' + ide.project.id)
				});
			}
		}
	},

	onMessage(data)
	{
		console.log(data);
	},

	start()
	{
		this.listenTo('socket.message.assist', this.onMessage.bind(this));
	}

});
