declare const cxl: any;
declare const ide: any;

const { Worker } = require('worker_threads'),
	plugin = (module.exports = cxl('workspace.typescript'));

function processHints(request, ev) {
	if (request && request.$ === ev.$) {
		request.respond('hints', 'setHints', [ev.hints, 'typescript']);
		console.log(`Respond hints ${ev.$}: ${ev.hints ? ev.hints.length : 0}`);
	} else console.log('hints', ev, request.$);
}

function processExtended(request, ev) {
	if (request && request.$ === ev.$) request.respondExtended(ev.hints);
	else console.log('extended', ev, request.$);
}

function processInline(request, ev) {
	if (request && request.$ === ev.$) request.respondInline(ev.hints);
	else console.log('inline', ev, request.$);
}

function getPayload(project) {
	return {
		project: {
			path: project.path,
			programs: project.configuration['typescript.programs'],
			files: project.files.files
		}
	};
}

function refresh(project, payload?) {
	payload = payload || getPayload(project);
	project.data.typescript.worker.postMessage({ type: 'refresh', ...payload });
}

function postMessage(req) {
	const data = req.project.data.typescript,
		token = req.features.token,
		file = req.features.file,
		worker = data.worker,
		requests = data.requests;

	let $hints, $completion, $extended;

	if (file.diffChanged) {
		requests.inline = req;
		console.log('Request inline: ' + req.$);
	}

	requests.extended = req;
	worker.postMessage({
		$: req.$,
		type: 'assist',
		token,
		file,
		extended: req.extended
	});
}

function onReady(ev, project) {
	const { path, data } = project;
	const ts = data.typescript;

	ts.ready = true;
	ts.postMessage = cxl.debounce(postMessage, 350);

	plugin.dbg(`[${path}] Using typescript v${ev.tsVersion}`);
	plugin.dbg(`[${path}] Config files used: ${ev.configFiles}`);

	if (ts.configFilesWatchers)
		ts.configFilesWatchers.forEach(w => w.unsubscribe());

	ts.configFilesWatchers = ev.configFiles.map(configFile =>
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
			requests: {},
			worker
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
		req.project.data.typescript.postMessage(req);
	}
}

function onProjectFileChanged(project, ev) {
	const data = project.data.typescript;

	if (data && data.ready && ev.type !== 'changed') {
		plugin.dbg(`Reloading language services for ${project.path}`);
		data.worker.postMessage({ type: 'refresh.files' });
	}
}

plugin.run(() => {
	ide.plugins.on('project.ready', onProjectLoad);
	ide.plugins.on('project.filechange', onProjectFileChanged);
	new AssistServer();
});
