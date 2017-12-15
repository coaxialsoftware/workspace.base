
var
	plugin = module.exports = cxl('workspace.css'),
	// TODO
	DEFS = require('./completions.json'),
	MIME_REGEX = /text\/(?:css|less|sass|x-scss)/
;

class CSSAssistServer extends ide.AssistServer {

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

	value(match)
	{
		match.icon = 'value';
		match.code = 'css';
		return match;
	}

	canAssist(request)
	{
		var file = request.features.file;

		return file && MIME_REGEX.test(file.mime);
	}

	extendedAssist(req, respond)
	{
		var token = req.features.token, match;

		switch (token.type) {
		case 'property error':
		case 'property':
			match = DEFS.properties[token.value];

			if (match)
				respond([ {
					title: token.value, icon: 'property', code: 'css',
					description: match.description }
				]);
			break;
		}
	}

	inlineAssist(req, respond)
	{
		var token = req.features.token, prop, assist=ide.assist;

		switch (token.type) {
		case 'tag':
			// LESS files send tag type for properties
			if (req.features.file.mime!=='text/css')
				respond(assist.findObject(DEFS.properties, token.cursorValue, this.property));

			return respond(assist.findArray(DEFS.tags, token.cursorValue, this.tag));
		case 'property error':
		case 'property':
			return respond(assist.findObject(DEFS.properties, token.cursorValue, this.property));
		case null: case 'variable':
			prop = req.plugins.css && req.plugins.css.property &&
				DEFS.properties[req.plugins.css.property];

			// TODO optimize
			if (prop)
				respond(assist.findArray(prop.values, token.cursorValue, this.value));

			prop = req.plugins.css && req.plugins.css.tag;

			if (prop && token.cursorValue.charAt(0)===':')
				respond(assist.findObject(DEFS.pseudoSelectors, token.cursorValue,
					this.propertyLong));
		}
	}

}

plugin.extend({

	sourcePath: __dirname + '/css.js',

	destroy: function()
	{
		this.ls.destroy();
	}

}).run(function() {

	this.ls = new CSSAssistServer();

});