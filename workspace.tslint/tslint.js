
ide.plugins.register('tslint', {

	commands: {
		'tslint.config': {
			fn: () =>
			{
				return ide.open({
					file: cxl.ajax.get('/tslint/config?p=' + ide.project.id)
				});
			}
		}
	}

});
