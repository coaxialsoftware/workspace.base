
QUnit.module('git', {
	before()
	{
		return cxl.ajax.get('/project?n=git&full=1').then(project => {
			this.project = project;
		});
	}
});

QUnit.test('Can load', function(a) {
	a.ok(this.project.ignore);
	a.ok(this.project.files);
});

QUnit.test('Can parse .gitignore', function(a) {
const
	p = this.project
;
	a.ok(p.ignore.length);
	a.ok(p.ignore.includes('ignore*'));
	a.ok(p.ignore.includes('!ignore-match'));
	a.ok(p.files.find(p => p.filename==='ignore-match'));
});

