
ide.plugins.register('npm', new ide.Plugin({

	icon: 'npm',

	commands: {

		'npm.view': {
			fn: function(package)
			{
				return cxl.ajax.get('/npm/view?p='+ ide.project.id +
					'&package=' + encodeURI(package||'')).then(function(content) {

					return ide.open(
						new ide.File(null, JSON.stringify(content, null, 2), 'application/json')
					);
				});
			}
		},

		'npm.install': {
			fn: function(package) {

				var n = ide.notify({ progress: 0, title: `npm install ${package||''}` });

				function done()
				{
					n.progress = 1;
					ide.notify(n);
				}

				return cxl.ajax.post('/npm/install', {
					project: ide.project.id, package: package
				}).then(done, done);
			},
			description: 'Install npm package'
		},

		'npm.list': {
			fn: function() {
				var editor = new ide.ListEditor({
					title: 'npm.list'
				});

				function enter(pkg)
				{
					ide.run('npm.view', [ pkg ]);
				}

				cxl.ajax.get('/npm/list?p=' + ide.project.id).then(function(pkg) {

					var items = [];

					cxl.each(pkg.dependencies, function(d, code) {
						if (d.missing)
							items.push({
								title: code, tags: [ 'missing', d.requiredBy ],
								enter: enter.bind(editor, code)
							});
						else
							items.push({
								tags: [ d.version ],
								description: d.description,
								title: d.name, enter: enter.bind(editor, code)
							});
					});

					editor.add(items);
				});

				return editor;
			}
		}
	},

	start: function()
	{
		ide.resources.registerSVGIcon('npm', `<path d="M0,327.303833h142.6240234v28.7337952h113.8902283V327.303833H512V155.9623718H0.0163122L0,327.303833z M142.6076965,298.5700989h-28.7337723v-85.1564636H86.1686859v85.1564636H27.6889133V184.6798553h114.9187851V298.5700989z M284.7256165,298.6231689h-55.9165802v28.6806946h-58.4797668V184.6798553h114.9187775L284.7256165,298.6231689z M484.2784424,298.6231689h-28.7337952v-85.2095337h-28.7337646v85.2095337h-28.7337952v-85.2095184h-27.7052307v85.2095184h-57.4512329V184.6798859H484.262085L484.2784424,298.6231689z M228.8090363,269.8363037h26.6766968v-56.4389954h-26.6766968V269.8363037z"/>`, '0 0 512 512');
	}

}));

