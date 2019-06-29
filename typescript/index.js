const
	fs = require('fs'),
	path = require('path'),
	ts = require('typescript'),
	plugin = module.exports = cxl('workspace.typescript')
;

class LanguageServiceHost {

	constructor(config)
	{
		this.config = config;
		this.fileExists = ts.sys.fileExists;
		this.readFile = ts.sys.readFile;
		this.readDirectory = ts.sys.readDirectory;
		this.files = {};
	}

	updateFileContents(path, content)
	{
		const previous = this.files[path], version = previous ? previous.version+1 : 0;
		this.files[path] = { content: content, version: version };
	}

	clearFileContent(path)
	{
		delete this.files[path];
	}

	getCompilationSettings()
	{
		return this.config.options;
	}

	getScriptFileNames()
	{
		return this.config.fileNames;
	}

	getScriptVersion(filename)
	{
		const file = this.files[filename];
		return file ? file.version : 0;
	}

	getCurrentDirectory()
	{
		return process.cwd();
	}

	getDefaultLibFileName(options)
	{
		return ts.getDefaultLibFilePath(options);
	}

	getScriptSnapshot(fileName)
	{
		const file = this.files[fileName];

		return ts.ScriptSnapshot.fromString(
			file ? file.content : fs.readFileSync(fileName).toString()
		);
    }
}

function createLanguageService(configFile)
{
	const config = ts.readConfigFile(configFile, file => fs.readFileSync(file, 'utf8'));

	const parseConfigHost = ts.ParseConfigHost = {
		fileExists: fs.existsSync,
		readDirectory: ts.sys.readDirectory,
		readFile: file => fs.readFileSync(file, "utf8"),
		useCaseSensitiveFileNames: true
	};

	const parsed = ts.parseJsonConfigFileContent(
		config.config,
		parseConfigHost,
		path.dirname(configFile),
		{ noEmit: true }
	);

	const host = new LanguageServiceHost(parsed);
	return {
		service: ts.createLanguageService(host),
		host: host
	};
}

function onProjectLoad(project)
{
	if (project.path === '.')
		return;

	let configFiles = project.configuration['typescript.programs'] ||
		ts.findConfigFile(project.path, fs.existsSync);

	if (!configFiles)
		return;

	project.configuration.tags.typescript = 'TS';
	project.data.typescript = {
		languageServices: configFiles.map(createLanguageService)
	};
}

class AssistServer extends ide.AssistServer {

	canAssist(req)
	{
		return req.project.data.typescript &&
			AssistServer.testMime(req, /application\/(?:typescript|javascript)/) &&
			req.features.token;
	}

	getCompletions(languageService, file, token, req)
	{
	const
		result = languageService.getCompletionsAtPosition(file, token.index),
		matches = result && result.entries &&
 			((token.cursorValue && token.cursorValue!=='.') ?
			result.entries.filter(r => r.name.indexOf(token.cursorValue)===0) :
			result.entries)

	;
		if (matches && matches.length)
			req.respondInline(matches.map(r => ({
				title: r.name,
				icon: r.kind
			})));
	}

	getExtended(languageService, file, token, req)
	{
	const
		result = languageService.getQuickInfoAtPosition(file, token.index)
	;
		console.log(result);
		if (result)
			req.respondExtended([{
				icon: result.kind,
				code: 'ts',
				title: result.displayParts.map(part => part.text).join(''),
				tags: result.tags && result.tags.map(tag => tag.name),
				description: result.documentation.map(doc => doc.text).join("\n\n")
			}]);
	}

	onAssist(req)
	{
		if (!req.features.token.cursorValue)
			return;
	const
		data = req.project.data.typescript,
		token = req.features.token,
		file = req.features.file,
		languageServices = data.languageServices
	;
		languageServices.find(
			ls => {
				const fileInfo = ls.host.getScriptFileNames().includes(file.path);

				if (fileInfo)
				{
					ls.host.updateFileContents(file.path, file.content);
					this.getCompletions(ls.service, file.path, token, req);

					if (req.extended)
						this.getExtended(ls.service, file.path, token, req);
				}

				return fileInfo;
			}
		);
	}

}

plugin.run(() => {

	ide.plugins.on('project.load', onProjectLoad);
	new AssistServer();

});