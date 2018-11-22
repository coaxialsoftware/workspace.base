
ide.plugins.register('css', {

	MIME_REGEX: /text\/(?:css|less|sass|x-scss)/,

	$handleAtom(request, token)
	{
		const val = token.value;

		if (val.charAt(0)==='#')
			request.respondExtended({
				code: 'css',
				title: '<span style="background-color:' + val + '">' + val + '</span>'
			});
	},

	onAssist(request)
	{
		if (!request.features.file || !request.features.token ||
			!this.MIME_REGEX.test(request.features.file.mime))
			return;

		var prev, token=request.editor.token.current;

		if (!token || token.row===undefined)
			return;

		if (token.type==='atom')
			this.$handleAtom(request, token);

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

	start()
	{
		this.listenTo('assist', this.onAssist);
	}

});
