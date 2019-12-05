const eslint = require('eslint'),
	engine = eslint.CLIEngine;
class AssistServer extends ide.AssistServer {
	lint(filename, content, linter) {
		const config = engine.getConfigForFile(filename),
			messages = linter.verify(content, config, { filename: filename });
		return messages;
	}

	parseResult(request, result) {
		let hints;

		if (result.failures) {
			hints = result.failures.map(function(rule) {
				return {
					code: 'tslint',
					title: rule.failure,
					range: {
						row: rule.startPosition.lineAndCharacter.line,
						column: rule.startPosition.lineAndCharacter.character,
						endRow: rule.endPosition.lineAndCharacter.line,
						endColumn: rule.endPosition.lineAndCharacter.character
					},
					className: rule.ruleSeverity === 'error' ? 'error' : 'warn'
				};
			});
		}

		request.respond('hints', 'setHints', [hints, 'tslint']);
	}

	canAssist(req) {
		const file = req.features.file;

		return (
			file &&
			file.diffChanged &&
			(file.mime === 'application/javascript' ||
				file.mime === 'application/typescript')
		);
	}

	getLinter(project) {
		if (!project.tags.eslint) return;

		return (
			project.data.eslint.linter ||
			(project.data.eslint = {
				linter: new eslint.Linter()
			})
		);
	}

	onAssist(request) {
		if (!request.features.hints) return;

		const file = request.features.file,
			project = request.project,
			linter = this.getLinter(project);
		if (!linter) return;

		setImmediate(() => {
			const result = this.lint(
				path.resolve(file.path),
				file.content,
				linter,
				project
			);
			console.log(result);
			// this.parseResult(request, result);
		});
	}
}

function onProjectLoad(project) {
	if (project.path === '.') return;
}

module.exports = cxl('workspace.eslint')
	.config(function() {
		this.server = workspace.server;
	})
	.run(function() {
		ide.plugins.on('project.load', onProjectLoad);
		new AssistServer();
	});
