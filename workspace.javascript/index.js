
var
	plugin = module.exports = cxl('workspace.javascript'),
	assist = ide.assist
;

plugin.Keywords = [
    // Existing Keywords
    "break",
    "case",
    "catch",
    "class",
    "const",
    "continue",
    "debugger",
    "default",
    "delete",
    "do",
    "else",
    "export",
    "extends",
    "finally",
    "for",
    "function",
    "if",
    "import",
    "in",
    "instanceof",
    "new",
    "return",
    "super",
    "switch",
    "this",
    "throw",
    "try",
    "typeof",
    "var",
    "void",
    "while",
    "with",
    "yield",

    // Future reserved keywords
    // The following are reserved as future keywords by the ECMAScript specification.
    // They have no special functionality at present, but they might at some future time,
    // so they cannot be used as identifiers.
    "enum",
    "implements",
    "interface",
    "let",
    "package",
    "private",
    "protected",
    "public",
    "static",
    "await",

    // The following are reserved as future keywords by older
    // ECMAScript specifications (ECMAScript 1 till 3).
    "abstract",
    "boolean",
    "byte",
    "char",
    "double",
    "final",
    "float",
    "goto",
    "int",
    "long",
    "native",
    "short",
    "synchronized",
    "throws",
    "transient",
    "volatile",
];

plugin.BrowserDefinitions = require('./browser.json');
plugin.ECMADefinitions = require('./ecmascript.json');

class JavascriptLanguageServer extends ide.AssistServer {

	constructor()
	{
		super();
		this.canAssist = ide.AssistServer.CanAssistMime(/application\/javascript/);
	}

	onKeyword(i)
	{
		i.icon = 'js';
		return i;
	}

	onBrowserInline(m)
	{
		if (m.title.charAt(0)==='!')
			return;

		m.icon = 'js';
		return m;
	}

	onBrowser(m, def, key, term)
	{
		if (term !== key || m.title.charAt(0)==='!')
			return;

		m.code = 'javascript';
		m.icon = 'js';
		m.description = def['!doc'];
		return m;
	}

	inlineAssist(request, done)
	{
		var token = request.features.token;

		if (token.type==='variable')
		{
			done(assist.findObject(plugin.BrowserDefinitions, token.cursorValue,
				this.onBrowserInline));
			done(assist.findObject(plugin.ECMADefinitions, token.cursorValue,
				this.onBrowserInline));
		}

		if (token.type==='variable' || token.type==='keyword')
			done(assist.findArray(plugin.Keywords, token.cursorValue, this.onKeyword));
	}

	extendedAssist(request, done)
	{
		var token = request.features.token;

		if (token && token.type==='variable')
		{
			done(assist.findObject(plugin.BrowserDefinitions, token.value, this.onBrowser));
			done(assist.findObject(plugin.ECMADefinitions, token.value, this.onBrowser));
		}
	}

}

plugin.extend({

	sourcePath: __dirname + '/javascript.js',

	destroy: function()
	{
		this.$ls.destroy();
	}

}).run(function() {

	this.$ls = new JavascriptLanguageServer();

});
