
ide.plugins.register('css', {

	MIME_REGEX: /text\/(?:css|less|sass|x-scss)/,

	onAssist: function(request)
	{
		if (!request.features.file || !request.features.token ||
			!this.MIME_REGEX.test(request.features.file.mime))
			return;

		var prev, token=request.editor.token.current;

		if (!token || token.row===undefined)
			return;

		prev = token.type===null ? token : token.previous();

		if (prev.value!==':' && prev.type===null)
			prev = prev.previous();

		if (prev.value!==':')
			return;

		prev = prev.previous();

		if (prev.type===null)
			prev = prev.previous();

		if (prev.type==='property')
			request.pluginData('css', { property: prev.value });
		else if (prev.type==='tag')
			request.pluginData('css', { tag: prev.value });
	},

	start: function()
	{
		this.listenTo('assist', this.onAssist);
	}

});
