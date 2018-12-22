var
	tslint = require('tslint'),
	path = require('path'),
	fs = require('fs')
;

class AssistServer extends ide.AssistServer {

	canAssist(request)
	{
		var file = request.features.file;

		return file && file.diffChanged && (
			file.mime==='application/javascript' ||
			file.mime==='application/typescript'
		);
	}

	lint(filename, content, linter)
	{
	var
		config = tslint.Configuration.findConfiguration(null, filename).results
	;
		linter.lint(filename, content, config);
		return linter.getResult();
	}

	parseResult(request, result)
	{
		if (result.failures)
		{
			var hints = result.failures.map(function(rule) {
				return {
					code: 'tslint',
					title: rule.failure,
					range: {
						row: rule.startPosition.lineAndCharacter.line,
						column: rule.startPosition.lineAndCharacter.character,
						endRow: rule.endPosition.lineAndCharacter.line,
						endColumn: rule.endPosition.lineAndCharacter.character
					},
					className: rule.ruleSeverity==='error' ? 'error' : 'warning'
				};
			});

			request.respond('hints', 'setHints', [ hints, 'tslint' ]);
		}
	}

	getLinter(project)
	{
		var program = this.getProgram(project);

		// Return a new linter so previous hints are cleared.
		return new tslint.Linter({ fix: false }, program);
	}

	getProgram(project)
	{
		if (!project.data.tslint)
			project.data.tslint = {};

		if (!project.data.tslint.program)
			project.data.tslint.program = fs.existsSync('tsconfig.json') ?
				tslint.Linter.createProgram(
					'tsconfig.json',
					project.fullPath
				) : undefined;

		return project.data.tslint.program;
	}

	onAssist(request)
	{
		if (!request.features.hints)
			return;

		var
			file = request.features.file,
			linter = this.getLinter(request.project)
		;

		setImmediate(() => {
			var result = this.lint(path.resolve(file.path), file.content, linter, request.project);

			this.parseResult(request, result);
		});
	}

}

module.exports = cxl('workspace.tslint').extend({

	sourcePath: __dirname + '/tslint.js'

}).route('GET', '/tslint/config', function(req, res) {

	ide.http.ServerResponse.respond(res, 'Hello', this);

}).config(function() {
	this.server = workspace.server;
}).run(function() {
	new AssistServer();
});