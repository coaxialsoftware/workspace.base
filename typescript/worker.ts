import { workerData, parentPort } from 'worker_threads';
import * as fs from 'fs';
import * as path from 'path';
import {
	Diagnostic,
	LanguageService,
	CompilerOptions,
	ParsedCommandLine
} from 'typescript';

type TypescriptModule = typeof import('typescript');

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

function escapeHtml(str: string) {
	return (
		str && str.replace(ENTITIES_REGEX, e => (ENTITIES_MAP as any)[e] || '')
	);
}

const documentRegistry = {
	files: {} as Record<string, SourceFile>,

	updateFile(path: string, content: string) {
		const previous = this.files[path],
			version = previous ? previous.version + 1 : 0;
		this.files[path] = { content: content, version: version };
	},

	releaseFile(path: string) {
		delete this.files[path];
	}
};

function readFile(path: string, encoding = 'utf8') {
	return documentRegistry[path]?.content || fs.readFileSync(path, encoding);
}

class LanguageServiceHost {
	fileExists = this.ts.sys.fileExists;
	readDirectory = this.ts.sys.readDirectory;
	readFile = readFile;
	config: ParsedCommandLine;

	private configHost = {
		fileExists: this.fileExists,
		readDirectory: this.readDirectory,
		getCurrentDirectory: this.getCurrentDirectory,
		readFile: this.readFile,
		useCaseSensitiveFileNames: true,
		onUnRecoverableConfigFileDiagnostic(e: any) {
			throw e;
		}
	};

	constructor(private ts: TypescriptModule, public configFile: string) {
		this.$parseConfig(configFile);
	}

	private $parseConfig(configFile: string) {
		const parsed = this.ts.getParsedCommandLineOfConfigFile(
			configFile,
			{},
			this.configHost
		);
		this.config = parsed;
	}

	reload() {
		this.$parseConfig(this.configFile);
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
		const file = documentRegistry.files[filename];
		return file ? file.version.toString() : '0';
	}

	getCurrentDirectory() {
		return process.cwd();
	}

	getDefaultLibFileName(options: CompilerOptions) {
		return this.ts.getDefaultLibFilePath(options);
	}

	getScriptSnapshot(fileName: string) {
		const file = documentRegistry.files[fileName];
		return this.ts.ScriptSnapshot.fromString(
			file ? file.content : fs.readFileSync(fileName, 'utf8')
		);
	}
}

class ProjectLanguageService {
	host: LanguageServiceHost;
	service: LanguageService;

	constructor(ts: TypescriptModule, configFile: string) {
		this.host = new LanguageServiceHost(ts, configFile);
		this.service = ts.createLanguageService(this.host);
	}

	dispose() {
		this.service.dispose();
	}
}

function findTypescript(project: Project): typeof import('typescript') {
	let path: string;

	try {
		path = require.resolve('typescript', { paths: [project.path] });
	} catch (e) {
		path = 'typescript';
	}

	const ts = require(path),
		version = ts.version?.split('.');

	if (!version || version[0] < 3 || version[1] < 5) {
		return require('typescript');
	}

	return ts;
}

let languageServices: ProjectLanguageService[];
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
	if (languageServices) {
		languageServices.forEach(ls => ls.dispose());
	}

	const ts = findTypescript(project);
	const configFiles = findConfigFiles(project);

	languageServices = configFiles.map(
		config => new ProjectLanguageService(ts, config)
	);

	parentPort?.postMessage({
		type: 'ready',
		configFiles,
		tsVersion: ts.version
	});
}

function getCompletions(
	languageService: LanguageService,
	file: string,
	token: any,
	$: number
) {
	const result = languageService.getCompletionsAtPosition(
			file,
			token.index,
			undefined
		),
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

function getHints(ls: LanguageService, file: any, $: number) {
	const diagnostics = [
		...ls.getSyntacticDiagnostics(file),
		...ls.getSemanticDiagnostics(file),
		...ls.getSuggestionDiagnostics(file),
		...ls.getCompilerOptionsDiagnostics()
	];

	const hints = diagnostics.flatMap(rule => flatHints(rule));

	parentPort?.postMessage({
		$,
		type: 'hints',
		hints
	});
}

function flatHints(rule: Diagnostic, msg?: any): any {
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

function getExtended(
	languageService: LanguageService,
	file: string,
	token: any,
	$: number
) {
	const result = languageService.getQuickInfoAtPosition(file, token.index);
	// console.log(languageService.getSignatureHelpItems(file, token, {}));
	if (result) {
		const hints = [
			{
				code: 'ts',
				title: result.displayParts
					? escapeHtml(
							result.displayParts.map(part => part.text).join('')
					  )
					: '',
				description:
					result.documentation &&
					escapeHtml(
						result.documentation.map(doc => doc.text).join('\n\n')
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
	const filePath = path.resolve(file.path);
	documentRegistry.updateFile(filePath, file.content);

	const projectService = languageServices.find(({ service, host }) => {
		const fileInfo = host.getScriptFileNames().includes(filePath);
		if (fileInfo) {
			getHints(service, filePath, $);
			if (file.diffChanged) {
				if (!token.cursorValue) return true;
				getCompletions(service, filePath, token, $);
			}

			if (extended) getExtended(service, filePath, token, $);

			return service;
		}
	});

	if (projectService)
		languageServices.forEach(({ service, host }) => {
			host.getProjectReferences()?.forEach(ref => {
				if (ref.path === projectService.host.configFile)
					service.cleanupSemanticCache();
			});
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
