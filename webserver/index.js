/*
 * workspace.webserver
 */

var plugin = (module.exports = cxl('workspace.webserver'));
plugin.config(function() {
	this.createServer();
	this.port = ide.configuration['webserver.port'] || 9011;
	this.host =
		ide.configuration['webserver.host'] || ide.configuration.host || '';

	this.use(cxl.static(ide.cwd));
});
