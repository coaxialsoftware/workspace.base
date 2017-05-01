
(function(ide) {
	
ide.plugins.register('javascript', {
	
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
		ide.plugins.on('assist.inline', this.onAssistInline.bind(this));
	}
	
});
	
})(this.ide);