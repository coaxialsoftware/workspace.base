
var
	plugin = module.exports = cxl('workspace.css'),
	// TODO
	DEFS = require('./completions.json')
;

class CSSLanguageServer extends workspace.LanguageServer {

	constructor()
	{
		super('css', /text\/(?:css|less|sass|x-scss)/);
	}

	tag(match)
	{
		match.icon = 'tag';
		return match;
	}

	property(match)
	{
		match.icon = 'property';
		return match;
	}

	propertyLong(match, prop)
	{
		match.icon = 'property';
		match.description = prop.description;
		match.code = 'css';
		return match;
	}

	onAssist(done, data)
	{
		var token = data.token, match;

		if (!token)
			return;

		switch (token.type) {
		case 'property error':
		case 'property':
			match = DEFS.properties[token.value];

			if (match)
				done([ {
					title: token.value, icon: 'property', code: 'css',
					description: match.description }
				]);
			break;
		}
	}

	onInlineAssist(done, data)
	{
		var token = data.token;

		switch (token.type) {
		case 'tag':
			// LESS files send tag type for properties
			if (data.mime!=='text/css')
				done(this.findObject(DEFS.properties, token.cursorValue, this.property));

			return done(this.findArray(DEFS.tags, token.cursorValue, this.tag));
		case 'property error':
		case 'property':
			return done(this.findObject(DEFS.properties, token.cursorValue, this.property));
		// TODO pseudo-selector token type.
		}
	}

}

plugin.extend({

	destroy: function()
	{
		this.ls.destroy();
	}

}).run(function() {

	this.ls = new CSSLanguageServer();

});