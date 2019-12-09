const { Worker } = require('worker_threads'),
	plugin = (module.exports = cxl('workspace.typescript'));

function processHints(request, ev) {
	if (request) request.respond('hints', 'setHints', [ev.hints, 'typescript']);
}

function processExtended(request, ev) {
	if (request) request.respondExtended(ev.hints);
}

function processInline(request, ev) {
	if (request) request.respondInline(ev.hints);
}

function getPayload(project) {
	return {
		project: {
			path: project.path,
			programs: project.configuration['typescript.programs']
		}
	};
}

function refresh(project, payload) {
	payload = payload || getPayload(project);
	project.data.typescript.worker.postMessage({ type: 'refresh', ...payload });
}

function onReady(ev, project) {
	const { path, data } = project;

	data.typescript.ready = true;
	plugin.dbg(`[${path}] Using typescript v${ev.tsVersion}`);
	plugin.dbg(`[${path}] Config files used: ${ev.configFiles}`);

	if (data.typescript.configFilesWatchers)
		data.typescript.configFilesWatchers.unsubscribe();

	data.typescript.configFilesWatchers = ev.configFiles.map(configFile =>
		new ide.FileWatch(configFile).subscribe(() => refresh(project))
	);
}

function onProjectLoad(project) {
	if (project.path === '.') return;

	let data = project.data,
		payload = getPayload(project);

	if (data.typescript) refresh(project, payload);
	else {
		const worker = new Worker(__dirname + '/worker.js', {
			workerData: payload
		});

		data.typescript = {
			$: 0,
			requests: {},
			worker
		};

		worker.on('message', ev => {
			const req = data.typescript.requests[ev.$];
			if (ev.type === 'ready') onReady(ev, project);
			else if (ev.type === 'hints') processHints(req, ev);
			else if (ev.type === 'assist.extended') processExtended(req, ev);
			else if (ev.type === 'assist.inline') processInline(req, ev);
		});
	}
}

class AssistServer extends ide.AssistServer {
	canAssist(req) {
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

	onAssist(req) {
		const data = req.project.data.typescript,
			token = req.features.token,
			file = req.features.file,
			worker = data.worker,
			requests = data.requests;
		delete requests[data.$];
		const id = data.$++;
		requests[id] = req;

		worker.postMessage({
			$: id,
			type: 'assist',
			token,
			file,
			extended: req.extended
		});
	}
}

function onProjectFileChanged(project, ev) {
	const data = project.data.typescript;

	if (data && ev.type !== 'changed') {
		plugin.dbg(`Reloading language services for ${project.path}`);
		data.worker.postMessage({ type: 'refresh.files' });
	}
}

plugin.run(() => {
	ide.plugins.on('project.load', onProjectLoad);
	ide.plugins.on('project.filechange', onProjectFileChanged);
	new AssistServer();
});
