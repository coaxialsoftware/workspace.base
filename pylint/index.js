
const
	plugin = module.exports = cxl('workspace.pylint'),

	exec = require('child_process').execSync,
	CLASS_NAME = {
		error: 'error',
		warning: 'warn',
		convention: 'warning'
	}
;

plugin.extend({

	sourcePath: __dirname + '/pylint.js',

	parse(req, res)
	{
	const
		data = JSON.parse(res.toString()),
		hints = data.map(msg => ({
			code: 'pylint',
			title: msg.message,
			range: {
				row: msg.line - 1,
				column: msg.column,
				endRow: msg.line - 1,
				endColumn: msg.column
			},
			className: CLASS_NAME[msg.type]
		}))
	;
		console.log(hints);
		req.respond('hints', 'setHints', [ hints, 'pylint' ]);

	},

	doLint(req, file)
	{
	const
		project = req.project,
		bin = ide.configuration['pylint.bin']
	;
		project.exec(bin + ' -f json ../' + file.path, { ignoreError: true })
			.then(out => this.parse(req, out))
			.catch(err => this.error(err))
		;
	},

	onAssist(req)
	{
		const file = req.features.file;

		if (!(file && file.diffChanged &&
			(file.mime ==='application/x-python')))
			return;

		this.doLint(req, file);
	}

}).run(function() {

	const bin = ide.configuration.registerSetting({
		name: 'pylint.bin',
		defaultValue: 'pylint3'
	});

	try {
		const version = exec(bin + ' --version').toString();

		ide.configuration.registerSetting({
			name: 'pylint.version',
			exposed: true,
			defaultValue: version
		});

	} catch (e) {
		this.log('pylint not found.');
	}

	ide.plugins.on('assist', this.onAssist.bind(this));

});