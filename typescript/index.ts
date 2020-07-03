declare const cxl: any;
declare const ide: any;

import { Worker } from 'worker_threads';

const plugin = (module.exports = cxl('workspace.typescript'));

interface ReadyEvent {
	type: string;
	configFiles: string[];
	tsVersion: string;
}

interface Request {
	$: number;
	extended: boolean;
	respond(plugin: string, method: string, params: any[]): void;
	respondExtended(hints: any[]): void;
	respondInline(hints: any[]): void;
	project: Project;
	features: any;
}

interface Event {
	$: number;
	hints: any[];
}

interface Project {
	path: string;
	configuration: any;
	files: any;
	data: any;
}

function processHints(request: Request, ev: Event) {
	if (request && request.$ === ev.$) {
		request.respond('hints', 'setHints', [ev.hints, 'typescript']);
	}
}

function processExtended(request: Request, ev: Event) {
	if (request && request.$ === ev.$) request.respondExtended(ev.hints);
}

function processInline(request: Request, ev: Event) {
	if (request && request.$ === ev.$) request.respondInline(ev.hints);
}

function getPayload(project: Project) {
	return {
		project: {
			path: project.path,
			programs: project.configuration['typescript.programs'],
			files: project.files.files,
		},
	};
}

function refresh(project: Project, payload?: any) {
	payload = payload || getPayload(project);
	plugin.dbg(`Refreshing "${project.path}"`);
	project.data.typescript.worker.postMessage({ type: 'refresh', ...payload });
}

function postMessage(req: Request) {
	const data = req.project.data.typescript,
		token = req.features.token,
		file = req.features.file,
		worker = data.worker,
		requests = data.requests;

	requests.inline = req;
	requests.extended = req;
	worker.postMessage({
		$: req.$,
		type: 'assist',
		token,
		file,
		extended: req.extended,
	});
}

function onReady({ configFiles, tsVersion }: ReadyEvent, project: Project) {
	const { path, data } = project;
	const ts = data.typescript;

	ts.ready = true;
	ts.postMessage = cxl.debounce(postMessage, 350);

	if (ts.configFilesWatchers)
		ts.configFilesWatchers.forEach((w: any) => w.unsubscribe());

	if (!configFiles || configFiles.length === 0)
		return plugin.dbg(
			`No tsconfig file found for project "${project.path}"`
		);

	plugin.dbg(`[${path}] Using typescript v${tsVersion}`);
	plugin.dbg(`[${path}] Config files used: ${configFiles}`);

	ts.configFilesWatchers = configFiles.map(configFile =>
		new ide.FileWatch(configFile).subscribe(() => refresh(project))
	);
}

function onProjectLoad(project: Project) {
	if (project.path === '.') return;

	let data = project.data,
		payload = getPayload(project);

	if (data.typescript) refresh(project, payload);
	else {
		const worker = new Worker(__dirname + '/worker.js', {
			workerData: payload,
		});

		data.typescript = {
			requests: {},
			worker,
		};

		worker.on('message', ev => {
			const req = data.typescript.requests;
			if (ev.type === 'ready') onReady(ev, project);
			else if (ev.type === 'hints') processHints(req.inline, ev);
			else if (ev.type === 'assist.extended')
				processExtended(req.extended, ev);
			else if (ev.type === 'assist.inline') processInline(req.inline, ev);
		});
	}
}

class AssistServer extends ide.AssistServer {
	canAssist(req: Request) {
		return (
			req.project.data.typescript &&
			req.project.data.typescript.ready &&
			(AssistServer.testMime(
				req,
				/application\/(?:typescript|javascript)/
			) ||
				AssistServer.testMime(req, /text\/jsx/)) &&
			req.features.token
		);
	}

	onAssist(req: Request) {
		req.project.data.typescript.postMessage(req);
	}
}

function onProjectFileChanged(project: Project, ev: any) {
	const data = project.data.typescript;

	if (data && data.ready && ev.type !== 'change') {
		plugin.dbg(
			`Reloading language services for ${project.path}(${ev.type})`
		);
		data.worker.postMessage({ type: 'refresh.files' });
	}
}

plugin.run(() => {
	ide.plugins.on('project.ready', onProjectLoad);
	ide.plugins.on('project.filechange', onProjectFileChanged);
	new AssistServer();
});
