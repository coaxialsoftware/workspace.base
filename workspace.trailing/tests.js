
QUnit.module('workspace.trailing');

QUnit.test('onFileWrite', function(a) {
var
	file = new ide.File('trailing1.js'),
	done = a.async()
;
	file.read('utf8').then(function() {
		return file.write(`function()  \t\n
		
{ \tconsole.log();\t
}    `);
	}).then(function() {
		a.equal(file.content, `function()


{ \tconsole.log();
}`);
		return file.read();
	}).then(function() {
		a.equal(file.content, `function()


{ \tconsole.log();
}`);
	}).then(done);
	
});