import { workerData, parentPort } from 'worker_threads';
import * as fs from 'fs';
import * as path from 'path';
import {
	Diagnostic,
	LanguageService,
	CompilerOptions,
	ParsedCommandLine,
} from 'typescript';
import * as ts from 'typescript';

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

interface SourceContent {
	content: string;
	version: number;
}

const ENTITIES_REGEX = /[&<>]/g,
	ENTITIES_MAP = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
	};

function escapeHtml(str: string) {
	return (
		str && str.replace(ENTITIES_REGEX, e => (ENTITIES_MAP as any)[e] || '')
	);
}

const fileCache = {
	files: {} as Record<string, SourceContent>,

	updateFile(path: string, content: string) {
		const previous = this.files[path],
			version = previous ? previous.version + 1 : 0;
		this.files[path] = { content: content, version: version };
	},

	releaseFile(path: string) {
		delete this.files[path];
	},
};

function readFile(path: string, encoding = 'utf8') {
	try {
		return fs.readFileSync(path, encoding);
	} catch (e) {
		console.error(e);
		return '';
	}
}

class LanguageServiceHost {
	config: ParsedCommandLine;

	fileExists = this.ts.sys.fileExists;
	readDirectory = this.ts.sys.readDirectory;
	readFile = readFile;
	version = 0;

	private configHost = {
		fileExists: this.fileExists,
		readDirectory: this.readDirectory,
		getCurrentDirectory: this.getCurrentDirectory,
		readFile: this.readFile,
		useCaseSensitiveFileNames: true,
		onUnRecoverableConfigFileDiagnostic(e: any) {
			throw e;
		},
	};

	constructor(private ts: TypescriptModule, public configFile: string) {
		this.config = this.$parseConfig(configFile);
	}

	private $parseConfig(configFile: string) {
		const parsed = this.ts.getParsedCommandLineOfConfigFile(
			configFile,
			{},
			this.configHost
		);

		if (!parsed) throw new Error('Invalid configuration file');

		return parsed;
	}

	reload() {
		this.config = this.$parseConfig(this.configFile);
	}

	getProjectVersion() {
		return this.version.toString();
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
		const file = fileCache.files[filename];
		return file ? file.version.toString() : '0';
	}

	getCurrentDirectory() {
		return process.cwd();
	}

	getDefaultLibFileName(options: CompilerOptions) {
		return this.ts.getDefaultLibFilePath(options);
	}

	getScriptSnapshot(fileName: string) {
		const file = fileCache.files[fileName];
		return this.ts.ScriptSnapshot.fromString(
			file ? file.content : fs.readFileSync(fileName, 'utf8')
		);
	}

	updateProjectVersion() {
		this.version++;
	}
}

class ProjectLanguageService {
	host: LanguageServiceHost;
	service: LanguageService;

	constructor(ts: TypescriptModule, configFile: string, docReg: any) {
		this.host = new LanguageServiceHost(ts, configFile);
		this.service = ts.createLanguageService(this.host, docReg);
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
let documentRegistry: any;
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
	documentRegistry = ts.createDocumentRegistry();

	languageServices = configFiles.map(
		config => new ProjectLanguageService(ts, config, documentRegistry)
	);

	parentPort?.postMessage({
		type: 'ready',
		configFiles,
		tsVersion: ts.version,
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
				icon: r.kind,
			})),
		});
}

function getHints(ls: LanguageService, file: any, $: number) {
	const diagnostics = [
		...ls.getSyntacticDiagnostics(file),
		...ls.getSemanticDiagnostics(file),
		...ls.getSuggestionDiagnostics(file),
		...ls.getCompilerOptionsDiagnostics(),
	];

	const hints = diagnostics.flatMap(rule => flatHints(rule));

	parentPort?.postMessage({
		$,
		type: 'hints',
		hints,
	});
}

function flatHints(rule: Diagnostic, msg?: any): any {
	msg = msg || rule.messageText;

	if (typeof msg === 'string')
		return {
			code: 'typescript',
			title: escapeHtml(msg),
			className: rule.category > 1 ? 'warn' : 'error',
			range: { index: rule.start, length: rule.length },
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

function postQuickInfo(quick: ts.QuickInfo) {
	const hints = [
		{
			code: 'ts',
			title: quick.displayParts
				? escapeHtml(quick.displayParts.map(part => part.text).join(''))
				: '',
			description:
				quick.documentation &&
				escapeHtml(
					quick.documentation.map(doc => doc.text).join('\n\n')
				),
		},
	];

	if (quick.tags) processTags(hints, quick);

	return hints;
}

function postDefinition(
	ls: LanguageService,
	typeDef: readonly ts.DefinitionInfo[],
	file: string,
	start: number
) {
	const hints = [];
	let i = 1;

	for (const def of typeDef) {
		if (file === def.fileName && start === def.textSpan.start) continue;

		const pos = ls.toLineColumnOffset?.(def.fileName, def.textSpan.start);
		if (!pos) continue;

		hints.push({
			code: 'ts',
			title: `Go to definition #${i++}`,
			action:
				file === def.fileName
					? pos.line + 1
					: 'e ' +
					  path.relative(workerData.project.path, def.fileName),
			index: def.textSpan.start,
		});
	}

	return hints;
}

function postHints(hints: any[], $: number) {
	if (hints.length)
		parentPort?.postMessage({
			$,
			type: 'assist.extended',
			hints,
		});
}

function getExtended(
	languageService: LanguageService,
	file: string,
	token: any,
	$: number
) {
	const start = token.index - token.cursorValue.length;
	const quick = languageService.getQuickInfoAtPosition(file, token.index);
	if (quick) postHints(postQuickInfo(quick), $);
	const def = languageService.getDefinitionAtPosition(file, token.index);
	if (def && def.length)
		postHints(postDefinition(languageService, def, file, start), $);
}

function onAssist({ token, file, extended, $ }: any) {
	const filePath = path.resolve(file.path);
	fileCache.updateFile(filePath, file.content);

	languageServices.find(({ service, host }) => {
		const isProjectFile = host.getScriptFileNames().includes(filePath);

		if (isProjectFile) {
			getHints(service, filePath, $);
			if (file.diffChanged) {
				host.updateProjectVersion();
				if (!token.cursorValue) return true;
				getCompletions(service, filePath, token, $);
			}
			if (extended) getExtended(service, filePath, token, $);
			return true;
		}
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
