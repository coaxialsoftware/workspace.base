const path = require('path');

class AssistServer extends ide.AssistServer {
	lint(filename, content, engine) {
		try {
			return engine.executeOnText(content, filename);
		} catch (e) {
			return;
		}
	}

	parseResult(request, report) {
		let hints,
			result = report && report.results[0].messages;

		if (result && result.length) {
			hints = result.map(rule => {
				return {
					code: 'eslint',
					title: rule.message,
					range: {
						row: rule.line - 1,
						column: rule.column,
						endRow: rule.endLine - 1,
						endColumn: rule.endColumn,
					},
					className: rule.severity === 2 ? 'error' : 'warn',
				};
			});
		}

		request.respond('hints', 'setHints', [hints, 'eslint']);
	}

	canAssist(req) {
		const file = req.features.file;
		return (
			file &&
			file.diffChanged &&
			(file.mime === 'application/javascript' ||
				file.mime === 'application/typescript' ||
				file.mime === 'text/jsx')
		);
	}

	getEslint(project) {
		let path;

		try {
			path = require.resolve('eslint', { paths: [project.path] });
			plugin.dbg(`Found local eslint at ${path}`);
		} catch (e) {
			path = 'eslint';
		}

		const eslint = require(path);

		plugin.log(`Using eslint ${eslint.Linter.version}`);

		return eslint;
	}

	getLinter(project) {
		const data = project.data;

		if (!data.eslint) {
			const cwd = path.resolve(project.path);
			const eslint = this.getEslint(project);

			data.eslint = {
				cli: new eslint.CLIEngine({
					cwd,
				}),
			};
		}

		return data.eslint.cli;
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

			this.parseResult(request, result);
		});
	}
}

const plugin = (module.exports = cxl('workspace.eslint')
	.config(function () {
		this.server = workspace.server;
	})
	.run(function () {
		new AssistServer();
	}));
