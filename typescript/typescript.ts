declare const ide: any;

ide.plugins.register('typescript', {
	ready() {
		const hint = new ide.DynamicItem({ code: 'typescript' });

		ide.plugins.on('socket.message.typescript', (data: any) => {
			if (data.tsVersion) hint.tags = [data.tsVersion];
		});

		ide.assist.addPermanentItem(hint);
	},
});
