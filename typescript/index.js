const fs = require('fs'),
	path = require('path'),
	rootTs = require('typescript'),
	plugin = (module.exports = cxl('workspace.typescript'));
const ParseConfigHost = {
	fileExists: fs.existsSync,
	readDirectory: rootTs.sys.readDirectory,
	readFile: file => fs.readFileSync(file, 'utf8'),
	useCaseSensitiveFileNames: true
};

class LanguageServiceHost {
	constructor(ts, configFile) {
		this.ts = ts;
		this.configFile = configFile;
		this.$initConfig(configFile);
		this.fileExists = ts.sys.fileExists;
		this.readFile = ts.sys.readFile;
		this.readDirectory = ts.sys.readDirectory;
		this.files = {};
	}

	$parseConfig(configFile) {
		plugin.dbg(`Parsing config file "${configFile}"`);

		const config = this.ts.readConfigFile(configFile, file =>
			fs.readFileSync(file, 'utf8')
		);
		const parsed = this.ts.parseJsonConfigFileContent(
			config.config,
			ParseConfigHost,
			path.dirname(configFile),
			{ noEmit: true }
		);
		this.config = parsed;
	}

	$initConfig(configFile) {
		this.$configSubscription = new ide.FileWatch(configFile).subscribe(() =>
			this.$parseConfig(configFile)
		);
		this.$parseConfig(configFile);
	}

	updateFileContents(path, content) {
		const previous = this.files[path],
			version = previous ? previous.version + 1 : 0;
		this.files[path] = { content: content, version: version };
	}

	clearFileContent(path) {
		delete this.files[path];
	}

	getCompilationSettings() {
		return this.config.options;
	}

	getScriptFileNames() {
		return this.config.fileNames;
	}

	getScriptVersion(filename) {
		const file = this.files[filename];
		return file ? file.version : 0;
	}

	getCurrentDirectory() {
		return process.cwd();
	}

	getDefaultLibFileName(options) {
		return this.ts.getDefaultLibFilePath(options);
	}

	getScriptSnapshot(fileName) {
		const file = this.files[fileName];

		return this.ts.ScriptSnapshot.fromString(
			file ? file.content : fs.readFileSync(fileName).toString()
		);
	}

	dispose() {
		this.$configSubscription.unsubscribe();
	}
}

function createLanguageService(ts, configFile) {
	const host = new LanguageServiceHost(ts, configFile);
	return {
		service: ts.createLanguageService(host),
		host: host,
		dispose() {
			this.service.dispose();
			this.host.dispose();
		}
	};
}

function findTypescript(project) {
	let path;

	try {
		path = require.resolve('typescript', { paths: [project.path] });
		plugin.dbg(`Found tsc at ${path}`);
	} catch (e) {
		path = 'typescript';
	}

	const ts = require(path),
		version = ts.version.split('.');

	if (version[0] < 3 || version[1] < 5) {
		plugin.log(
			`Typescript version not supported ${ts.version}, falling back to ${rootTs.version}`
		);
		return rootTs;
	}

	return ts;
}

function onProjectLoad(project) {
	if (project.path === '.') return;

	let ts,
		data = project.data.typescript;

	if (data) {
		data.languageServices.forEach(ls => ls.dispose());
		ts = data.tsc;
	} else {
		ts = findTypescript(project);
		plugin.dbg(`Project "${project.path}" using typescript ${ts.version}`);
	}

	let configFiles =
		project.configuration['typescript.programs'] ||
		ts.findConfigFile(project.path, fs.existsSync);

	if (!configFiles)
		return plugin.dbg(
			`No tsconfig file found for project "${project.path}"`
		);

	if (!Array.isArray(configFiles)) configFiles = [configFiles];

	project.configuration.tags.typescript = 'TS';
	project.data.typescript = {
		tsc: ts,
		languageServices: configFiles.map(config =>
			createLanguageService(ts, config)
		)
	};
}

function flatHints(rule, msg) {
	msg = msg || rule.messageText;

	if (typeof msg === 'string')
		return {
			code: 'typescript',
			title: ide.escapeHtml(msg),
			className: 'error',
			range: { index: rule.start, length: rule.length }
		};
	else {
		const result = [];
		do {
			result.push(flatHints(rule, msg.messageText));
		} while ((msg = msg.next && msg.next[0]));
		return result;
	}
}

class AssistServer extends ide.AssistServer {
	canAssist(req) {
		return (
			req.project.data.typescript &&
			(AssistServer.testMime(
				req,
				/application\/(?:typescript|javascript)/
			) ||
				AssistServer.testMime(req, /text\/jsx/)) &&
			req.features.token
		);
	}

	getCompletions(languageService, file, token, req) {
		const result = languageService.getCompletionsAtPosition(
				file,
				token.index
			),
			matches =
				result &&
				result.entries &&
				(token.cursorValue && token.cursorValue !== '.'
					? result.entries.filter(
							r => r.name.indexOf(token.cursorValue) === 0
					  )
					: result.entries);

		if (matches && matches.length)
			req.respondInline(
				matches.map(r => ({
					title: ide.escapeHtml(r.name),
					icon: r.kind
				}))
			);
	}

	getHints(ls, file, request) {
		const diagnostics = [
			...ls.getSyntacticDiagnostics(file),
			...ls.getSemanticDiagnostics(file),
			...ls.getSuggestionDiagnostics(file)
		];

		const hints = (this.savedHints = diagnostics.flatMap(rule =>
			flatHints(rule)
		));

		request.respond('hints', 'setHints', [hints, 'typescript']);
	}

	getExtended(languageService, file, token, req) {
		const result = languageService.getQuickInfoAtPosition(
			file,
			token.index
		);
		if (result)
			req.respondExtended([
				{
					code: 'ts',
					title: ide.escapeHtml(
						result.displayParts.map(part => part.text).join('')
					),
					tags: result.tags && result.tags.map(tag => tag.name),
					description: ide.escapeHtml(
						result.documentation &&
							result.documentation
								.map(doc => doc.text)
								.join('\n\n')
					)
				}
			]);
	}

	onAssist(req) {
		const data = req.project.data.typescript,
			token = req.features.token,
			file = req.features.file,
			languageServices = data.languageServices;
		languageServices.find(ls => {
			const fileInfo = ls.host.getScriptFileNames().includes(file.path);

			if (fileInfo) {
				ls.host.updateFileContents(file.path, file.content);

				if (file.diffChanged) this.getHints(ls.service, file.path, req);

				if (!req.features.token.cursorValue) return;

				this.getCompletions(ls.service, file.path, token, req);

				if (req.extended)
					this.getExtended(ls.service, file.path, token, req);
			}

			return fileInfo;
		});
	}
}

function onProjectFileChanged(project, ev) {
	const data = project.data.typescript;

	if (data && ev.type !== 'changed')
		data.languageServices.forEach(ls => {
			ls.host.$parseConfig(ls.host.configFile);
		});
}

plugin.run(() => {
	ide.plugins.on('project.load', onProjectLoad);
	ide.plugins.on('project.filechange', onProjectFileChanged);
	new AssistServer();
});
