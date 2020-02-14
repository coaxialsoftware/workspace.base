import { workerData, parentPort } from 'worker_threads';
import * as fs from 'fs';
import * as path from 'path';

interface ProjectFile {
	filename: string;
	mime: string;
}

interface Project {
	path: string;
	programs?: string[];
	files: ProjectFile[];
}

interface SourceFile {
	content: string;
	version: number;
}

const ENTITIES_REGEX = /[&<>]/g,
	ENTITIES_MAP = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;'
	};

const projectFiles: Record<string, SourceFile> = {};

function escapeHtml(str: string) {
	return (
		str && str.replace(ENTITIES_REGEX, e => (ENTITIES_MAP as any)[e] || '')
	);
}

class LanguageServiceHost {
	fileExists = this.ts.sys.fileExists;
	readFile = this.ts.sys.readFile;
	readDirectory = this.ts.sys.readDirectory;
	config: any;

	private configHost = {
		fileExists: fs.existsSync,
		readDirectory: this.ts.sys.readDirectory,
		getCurrentDirectory: this.ts.sys.getCurrentDirectory,
		readFile: (file: string) => fs.readFileSync(file, 'utf8'),
		useCaseSensitiveFileNames: true
	};

	constructor(private ts: any, public configFile: string) {
		this.$initConfig(configFile);
	}

	private $parseConfig(configFile: string) {
		const parsed = this.ts.getParsedCommandLineOfConfigFile(
			configFile,
			{},
			this.configHost
		);
		this.config = parsed;
	}

	private $initConfig(configFile: string) {
		this.$parseConfig(configFile);
	}

	reload() {
		this.$parseConfig(this.configFile);
	}

	updateFileContents(path: string, content: string) {
		const previous = projectFiles[path],
			version = previous ? previous.version + 1 : 0;
		projectFiles[path] = { content: content, version: version };
	}

	clearFileContent(path: string) {
		delete projectFiles[path];
	}

	getProjectReferences() {
		return this.config.projectReferences;
	}

	getCompilationSettings() {
		return this.config.options;
	}

	getScriptFileNames() {
		return this.config.fileNames;
	}

	getScriptVersion(filename: string) {
		const file = projectFiles[filename];
		return file ? file.version : 0;
	}

	getCurrentDirectory() {
		return process.cwd();
	}

	getDefaultLibFileName(options: any) {
		return this.ts.getDefaultLibFilePath(options);
	}

	getScriptSnapshot(fileName: string) {
		const file = projectFiles[fileName];

		return this.ts.ScriptSnapshot.fromString(
			file ? file.content : fs.readFileSync(fileName, 'utf8')
		);
	}
}

class LanguageService {
	host: LanguageServiceHost;
	service: any;

	constructor(ts: any, configFile: string) {
		const host = (this.host = new LanguageServiceHost(ts, configFile));
		this.service = ts.createLanguageService(host);
	}

	dispose() {
		this.service.dispose();
	}
}

function findTypescript(project: Project) {
	let path: string;

	try {
		path = require.resolve('typescript', { paths: [project.path] });
	} catch (e) {
		path = 'typescript';
	}

	const ts = require(path),
		version = ts.version.split('.');

	if (version[0] < 3 || version[1] < 5) {
		return require('typescript');
	}

	return ts;
}

let languageServices: LanguageService[];
const CONFIG_FILE_REGEX = /tsconfig(?:\..*)?\.json$/;

function findConfigFiles({ path, programs, files }: Project) {
	if (programs) return programs.map(p => path + '/' + p);
	return (
		files &&
		files
			.filter(file => CONFIG_FILE_REGEX.test(file.filename))
			.map(file => `${path}/${file.filename}`)
	);
}

function load(project: Project) {
	let ts: any;

	if (languageServices) {
		languageServices.forEach(ls => ls.dispose());
	}

	ts = findTypescript(project);

	let configFiles = findConfigFiles(project);

	languageServices = configFiles.map(
		config => new LanguageService(ts, config)
	);

	parentPort?.postMessage({
		type: 'ready',
		configFiles,
		tsVersion: ts.version
	});
}

function getCompletions(
	languageService: any,
	file: any,
	token: any,
	$: number
) {
	const result = languageService.getCompletionsAtPosition(file, token.index),
		matches =
			result &&
			result.entries &&
			(token.cursorValue && token.cursorValue !== '.'
				? result.entries.filter(
						(r: any) => r.name.indexOf(token.cursorValue) === 0
				  )
				: result.entries);

	if (matches && matches.length)
		parentPort?.postMessage({
			$,
			type: 'assist.inline',
			hints: matches.map((r: any) => ({
				title: r.name,
				icon: r.kind
			}))
		});
}

function getHints(ls: any, file: any, $: number) {
	const diagnostics = [
		...ls.getSyntacticDiagnostics(file),
		...ls.getSemanticDiagnostics(file),
		...ls.getSuggestionDiagnostics(file),
		...ls.getCompilerOptionsDiagnostics()
	];

	const hints = diagnostics.flatMap((rule: any) => flatHints(rule));

	parentPort?.postMessage({
		$,
		type: 'hints',
		hints
	});
}

function flatHints(rule: any, msg?: any): any {
	msg = msg || rule.messageText;

	if (typeof msg === 'string')
		return {
			code: 'typescript',
			title: escapeHtml(msg),
			className: rule.category > 1 ? 'warn' : 'error',
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

function processTags(hints: any[], result: any) {
	const mainHint = hints[0],
		tags: string[] = (mainHint.tags = []);

	result.tags.forEach((tag: any) => {
		if (tag.name === 'description' && !mainHint?.description)
			mainHint.description = escapeHtml(tag.text);
		else tags.push(tag.name);
	});
}

function getExtended(languageService: any, file: any, token: any, $: number) {
	const result = languageService.getQuickInfoAtPosition(file, token.index);
	if (result) {
		const hints = [
			{
				code: 'ts',
				title: escapeHtml(
					result.displayParts.map((part: any) => part.text).join('')
				),
				description:
					result.documentation &&
					escapeHtml(
						result.documentation
							.map((doc: any) => doc.text)
							.join('\n\n')
					)
			}
		];

		if (result.tags) processTags(hints, result);

		parentPort?.postMessage({
			$,
			type: 'assist.extended',
			hints
		});
	}
}

function onAssist({ token, file, extended, $ }: any) {
	languageServices.find(ls => {
		const filePath = path.resolve(file.path);
		const fileInfo = ls.host.getScriptFileNames().includes(filePath);
		if (fileInfo) {
			ls.host.updateFileContents(filePath, file.content);

			getHints(ls.service, filePath, $);
			if (file.diffChanged) {
				if (!token.cursorValue) return true;
				getCompletions(ls.service, filePath, token, $);
			}

			if (extended) getExtended(ls.service, filePath, token, $);
		}

		return fileInfo;
	});
}

function refreshFiles() {
	languageServices.forEach(ls => {
		ls.host.reload();
	});
}

load(workerData.project);

parentPort?.on('message', (ev: any) => {
	try {
		if (ev.type === 'assist') onAssist(ev);
		else if (ev.type === 'refresh') load(ev.project);
		else if (ev.type === 'refresh.files') refreshFiles();
	} catch (e) {
		console.error(e);
	}
});
