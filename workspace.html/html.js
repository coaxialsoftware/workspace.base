
ide.plugins.register('html', {

	MIME_REGEX: /text\/(?:html)/,

	onAssist(request)
	{
		if (!request.features.file || !request.features.token ||
			!this.MIME_REGEX.test(request.features.file.mime))
			return;

		var token = request.editor.token.current, tag, attribute;

		if (token.type==='attribute' || token.type==='string')
			tag = token.$token.state.htmlState.tagName;

		if (tag || attribute)
			request.pluginData('html', { tag: tag, attribute: attribute });
	},

	start()
	{
		this.listenTo('assist', this.onAssist);
	}

});