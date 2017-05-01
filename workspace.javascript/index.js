
var
	plugin = module.exports = cxl('workspace.javascript')
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

class JavascriptLanguageServer extends workspace.LanguageServer {
	
	constructor()
	{
		super('javascript', /application\/javascript/);
	}
	
	onInlineAssist(done, data)
	{
		var matches;
		
		if (data.token && data.token.type==='variable' || data.token.type==='keyword')
		{
			matches = this.findArray(plugin.Keywords, data.token.cursorValue, function(i) {
				i.icon = 'keyword';
				return i;
			});
			
			if (matches.length)
				done(matches);
		}
	}
	
}

plugin.extend({

	sourcePath: __dirname + '/javascript.js',

}).run(function() {

	this.$ls = new JavascriptLanguageServer();

});
