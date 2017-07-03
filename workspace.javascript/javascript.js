
(function(ide) {

ide.plugins.register('javascript', new ide.Plugin({

	onAssistInline: function(done, editor, token)
	{
		var vars, start, result;

		if (token instanceof ide.SourceToken && token.$token.state)
		{
			vars=token.$token.state.localVars;

			if (!vars) return;

			result = [];

			do {
				start=vars.name.indexOf(token.cursorValue);
				if (start!==-1)
					result.push({
						title: vars.name, matchStart: start,
						matchEnd: start+token.cursorValue.length,
						icon: 'variable'
					});
			} while ((vars=vars.next));

			if (result.length)
				done(result);
		}
	},

	ready: function()
	{
		this.listenTo('assist.inline', this.onAssistInline);
		ide.resources.registerSVGIcon('js', `<path d="M111.493 67.198h85.14v238.647c0 107.543-51.547 145.086-133.896 145.086-20.155 0-45.94-3.358-62.737-8.965l9.533-68.91c11.758 3.926 26.897 6.717 43.694 6.717 35.863 0 58.266-16.25 58.266-74.495V67.197zM270.56 357.38c22.404 11.758 58.267 23.55 94.674 23.55 39.223 0 59.946-16.252 59.946-41.447 0-22.97-17.93-36.975-63.305-52.66-62.737-22.402-104.184-57.13-104.184-112.604 0-64.418 54.34-113.15 142.84-113.15 43.126 0 73.95 8.397 96.353 19.043l-19.044 68.344c-14.573-7.286-42.015-17.932-78.422-17.932-36.975 0-54.907 17.364-54.907 36.408 0 24.082 20.724 34.728 70.025 53.772C481.2 245.355 512 280.083 512 333.855c0 63.304-48.165 117.076-151.805 117.076-43.126 0-85.707-11.757-106.998-23.537l17.364-70.012z"/>`, '0 0 600 512');
	}

}));

})(this.ide);