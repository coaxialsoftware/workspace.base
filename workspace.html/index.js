
const
	plugin = module.exports = cxl('workspace.html'),
	DEFS = require('./completions.json'),
	MIME_REGEX = /text\/(?:html)/
;

class HTMLAssistServer extends ide.AssistServer {

	canAssist(request)
	{
		var file = request.features.file;

		return file && MIME_REGEX.test(file.mime);
	}

	tag(match)
	{
		match.icon = 'tag';
		return match;
	}

	attribute(match)
	{
		match.icon = 'property';
		return match;
	}

	inlineAssist(req, res)
	{
		var token = req.features.token;

		switch (token.type) {
		case 'tag':
			return res(ide.assist.findObject(DEFS.tags, token.cursorValue, this.tag));
		case 'attribute':
			return res(ide.assist.findObject(DEFS.attributes, token.cursorValue, this.attribute));
		}
	}

	extendedAssist(req, respond)
	{
		var token = req.features.token, match;

		switch (token.type) {
		case 'tag':
			if ((match = DEFS.tags[token.value]))
				respond([{
					title: token.value, icon: 'tag', code: 'html', description: match.description
				}]);

			break;
		case 'attribute':
			if ((match = DEFS.attributes[token.value]))
				respond([{
					title: token.value,
					icon: 'property',
					code: 'html',
					description: match.description
				}]);

			break;
		}
	}

}

plugin.extend({

	sourcePath: __dirname + '/html.js'

}).run(function() {

	this.ls = new HTMLAssistServer();

});