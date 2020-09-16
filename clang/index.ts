declare const cxl: any;
declare const ide: any;

import { spawn } from 'child_process';

interface Request {
	$: number;
	client: any;
	extended: boolean;
	respond(plugin: string, method: string, params: any[]): void;
	respondExtended(hints: any[]): void;
	respondInline(hints: any[]): void;
	project: any;
	features: any;
}

const REGEX_COMPLETION = /COMPLETION: (?:Pattern : )?([^\s]+)/g;
const REGEX_ERROR = /(.+):(\d+):(\d+): (.+): (.+)/g;
const plugin = (module.exports = cxl('workspace.clang'));

class AssistServer extends ide.AssistServer {
	args = [
		'-Wall',
		'-fsyntax-only',
		'-xc',
		'-fno-caret-diagnostics',
		'-Xclang',
		'-code-completion-macros',
		'-Xclang',
		'-code-completion-brief-comments',
		'-fno-color-diagnostics',
		'-Xclang',
		'-code-completion-at=',
		'-',
	];

	canAssist(req: Request) {
		return AssistServer.testMime(req, /text\/x-c/) && req.features.token;
	}

	parseErrors(err: string, req: Request) {
		const hints = [];
		let m: RegExpExecArray | null;
		while ((m = REGEX_ERROR.exec(err)))
			hints.push({
				title: m[5],
				code: 'clang',
				className: m[4] === 'error' ? 'error' : 'warn',
				range: { row: +m[2] - 1, column: +m[3] - 1 },
			});

		req.respond('hints', 'setHints', [hints, 'clang']);
	}

	parseCompletions(out: string, token: string, req: Request) {
		const hints = [];
		let m: RegExpExecArray | null;
		while ((m = REGEX_COMPLETION.exec(out)))
			if (m[1] && m[1].startsWith(token))
				hints.push({
					title: m[1],
					icon: 'clang',
				});
		if (hints.length) req.respondInline(hints);
	}

	spawn(req: Request, complete = false) {
		const { file, token } = req.features;
		const pos = `-:${token.cursorRow + 1}:${token.cursorColumn + 1}`;
		this.args[9] = complete ? '-Xclang' : '';
		this.args[10] = complete ? '-code-completion-at=' + pos : '';
		const process = spawn('clang', this.args, {
			timeout: 2000,
			cwd: req.project.path,
		});
		let err = '';
		process.stdin.write(file.content);
		process.stdin.end();

		if (complete && token.cursorValue)
			process.stdout.on('data', d =>
				this.parseCompletions(d.toString(), token.cursorValue, req)
			);
		process.stderr.on('data', d => (err += d.toString()));
		process.on('exit', () => this.parseErrors(err, req));
	}

	onAssist(req: Request) {
		this.spawn(req, true);
		this.spawn(req);
	}
}

plugin.run(() => {
	new AssistServer();
});
