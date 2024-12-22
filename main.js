const { app, BaseWindow, WebContentsView, ipcMain, session, desktopCapturer } = require('electron/main');
const process = require('node:process');
const path = require('node:path');
const fs = require('node:fs');
const sharp = require('sharp');

var main_window;
var website_view;
var foxkit_view;
var side_panel_width = 263;


var developer_mode = false;
for(var i = 0 ; i < process.argv.length ; i++){
	if(process.argv[i] === 'dev'){
		developer_mode = true;
		launch_dummy_webpage_for_testing();
	}
}

function launch_dummy_webpage_for_testing(){
	const http = require('node:http');

	var dev_server = http.createServer(function(req, res){
		var file_url = (req.url === '/' ? path.join(__dirname, 'app', 'dev', 'dummy.html') : path.join(__dirname, 'app', 'dev', req.url));
		var file_data = fs.readFileSync(file_url);
		res.writeHead(200, {'Content-Type': 'text/html'});	// this simple server assumes that we're always sending html files
		res.end(file_data);
	}).listen(0, function(){
		global.DEV_SERVER_PORT = dev_server.address().port;
		console.log('Local web server setup on port: ' + global.DEV_SERVER_PORT);
	});
}

function create_window(){

	main_window = new BaseWindow({
		minWidth: 819,
		minHeight: 532,
		width: 1079,
		height: 532,
		icon: path.join(__dirname, 'temp-icon.png')
	});
	main_window.removeMenu();
	main_window.maximize();
	main_window.on('resize', reposition_views);

	website_view = new WebContentsView({ webPreferences: { preload: path.join(__dirname, 'app', 'preload.js') } });
	main_window.contentView.addChildView(website_view);
	add_zoom_functionality_to_view(website_view);
	add_hotkey_handlers_to_view(website_view);
	website_view.webContents.fk_id = 'webview';

	foxkit_view = new WebContentsView({ webPreferences: { preload: path.join(__dirname, 'app', 'preload.js') } });
	main_window.contentView.addChildView(foxkit_view);
	add_zoom_functionality_to_view(foxkit_view);
	add_hotkey_handlers_to_view(foxkit_view);
	foxkit_view.webContents.loadFile(path.join(__dirname, 'app', 'frontend', 'foxkit.html'));
	foxkit_view.webContents.once('did-finish-load', reposition_views);
	foxkit_view.webContents.fk_id = 'foxkit';

	load_website();
}

function load_website(){
	if(developer_mode === true){
		website_view.webContents.loadURL('http://localhost:' + global.DEV_SERVER_PORT);
	}else{
		website_view.webContents.loadURL('https://www.2004scape.org/title');
	}
}

app.whenReady().then(function(){
	setup_session();
	create_window();
	app.on('activate', function(){
		if(BaseWindow.getAllWindows().length === 0){
			create_window();
		}
	});
});

app.on('window-all-closed', function(){
	if(process.platform !== 'darwin'){
		app.quit();
	}else{
		website_view = undefined;
		foxkit_view = undefined;
		main_window = undefined;
	}
});

function setup_session(){
	var regex_trusted_hosts = [
		/^file:\/\/\//,										// this matches local files like `file:///etc/example.png`
		/^http:\/\/localhost:[0-9]+/,						// this matches local files like `http://localhost:12345/example.png`
		/^devtools:\/\/devtools\//,							// this matches the devtools that are used when opening the developer console in electron
		/^https:\/\/www.2004scape.org\//,					// match the main website
		/^https:\/\/w[0-9]+.[0-9]+.2004scape.org\//,		// this will match http traffic for any combination of worlds/revs
		/^wss:\/\/w[0-9]+.[0-9]+.2004scape.org:[0-9]+\//	// this will match web socket connections for any combination of worlds/revs/ports
	];

	session.defaultSession.webRequest.onHeadersReceived(function(details, callback){
		var trusted_host = regex_trusted_hosts.some(function(rx){
			return rx.test(details.url);
		});
		if(trusted_host === true){
			// we're either on the official lost city website, or loading a file from local
			// it should be safe to give ourselves a few extra permissions
			callback({
				responseHeaders: {
					...details.responseHeaders,
					'Content-Security-Policy': ['script-src \'self\' \'unsafe-inline\' \'wasm-unsafe-eval\'']
					// we need to allow both unsafe inline JS and WASM for the web client to work
					// - https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy/script-src#unsafe_inline_script
				}
			});
		}else{
			// anywhere else on the internet, we'll try to keep it as locked down as possible
			console.log('Blocked potentially unsafe host: ' + details.url);
			callback({
				responseHeaders: {
					...details.responseHeaders,
					'Content-Security-Policy': ['default-src \'none\'']
					// just disable everything, this is not a web browser..
				}
			});
		}
	});
}

// temp.. settings will eventually save/load from disk
// temp.. settings will eventually save/load from disk
// temp.. settings will eventually save/load from disk
var Settings = {
	webview: {
		banner_visibility: true,
		cellpadding_visibility: true,
		scrollbar_visibility: true
	},
	fkview: {
		pixelated_images: false
	}
}

ipcMain.on('view-loaded', function(event, view){
	if(view === 'foxkit'){
		// foxkit
		foxkit_view.webContents.send('load-settings', Settings);
	}else{
		// website
		website_view.webContents.send('set-banner-visibility', Settings.webview.banner_visibility);
		website_view.webContents.send('set-cellpadding-visibility', Settings.webview.cellpadding_visibility);
		website_view.webContents.send('set-scrollbar-visibility', Settings.webview.scrollbar_visibility);
	}
});

function add_zoom_functionality_to_view(view){
	view.webContents.on('zoom-changed', function(event, zoom_direction){
		var zoom_amount = 0.1;
		if(zoom_direction === 'in'){
			view_set_zoom(view.webContents, Math.min(view.webContents.zoomFactor + zoom_amount, 5));
		}else if(zoom_direction === 'out'){
			view_set_zoom(view.webContents, Math.max(view.webContents.zoomFactor - zoom_amount, (this.fk_id === 'webview' ? 1 : 0.3)));
		}
	});
}

function view_set_zoom(webContents, zoom){
	webContents.setZoomFactor(JSON.parse(zoom.toFixed(1)));	// there are slight rounding errors while zooming, this at least keeps things a bit more consistent
	reposition_views();
	send_zoom_feedback(webContents);
}

function send_zoom_feedback(webContents, silent){
	// if silent is set to true, the little pop up that shows up in the top left corner of the view will not pop up
	webContents.send('zoom-display', {
		silent: silent || false,
		zoom: webContents.zoomFactor
	});
}

function add_hotkey_handlers_to_view(view){
	view.webContents.on('before-input-event', function(event, input){
		if(input.type === 'keyDown' && input.key.toLowerCase() === 'f12'){
			// F12 - take screenshot
			// we should probably allow screenshot to be reassigned or even un-mapped, but for now we'll just leave it on F12
			if(true){	// TODO - switch this to a setting on whether the entire window should be captured, or just the game itself
				website_view.webContents.send('request-gameframe-position-for-screenshot');
			}else{
				take_screenshot();
			}
		}else if(input.type === 'keyUp' && input.control && input.key === '0'){
			// Ctrl+0 - reset zoom for the selected view
			view_set_zoom(this, 1);
		}else if(developer_mode === true && input.type === 'keyUp' && input.control && input.shift && input.key.toLowerCase() === 'i'){
			// Ctrl+Shift+i - open dev console (only if in dev mode, not production)
			this.isDevToolsOpened() ? this.closeDevTools() : this.openDevTools();
		}else if(input.type ==='keyDown' && input.key.toLowerCase() === 'f11'){
			// F11 - toggle windowed borderless
			main_window.fullScreen ? main_window.setFullScreen(false) : main_window.setFullScreen(true);
		}
	});
}

function get_main_window(){
	// we should only have one window, so we can just assume that the first result is the right one
	return BaseWindow.getAllWindows()[0];
}

ipcMain.on('load-website', function(){
	load_website();
});

ipcMain.on('resize-panel-width', function(event, width){
	side_panel_width = width;
	reposition_views();
});

function reposition_views(){
	var window = get_main_window();
	var window_bounds = window.getBounds();

	var panel_size = side_panel_width * foxkit_view.webContents.getZoomFactor();

	website_view.setBounds({ x: 0, y: 0, width: window_bounds.width - panel_size, height: window_bounds.height });
	foxkit_view.setBounds({ x: window_bounds.width - panel_size, y: 0, width: panel_size, height: window_bounds.height });

	// this should work, but doesn't seem to update.. (at least on linux)
	// get_main_window().setMinimumSize(789 + Math.round(foxkit_view.webContents.getZoomFactor() * 30), 532);
}

ipcMain.on('gameframe-position-for-screenshot', function(event, data){
	take_screenshot(data.offset);
});

function take_screenshot(sub_bounds){

	var window = get_main_window();
	var window_bounds = window.getBounds();

	desktopCapturer.getSources({
		types: ['window'],
		thumbnailSize: {
			width: window_bounds.width,
			height: window_bounds.height
		}
	}).then(async function(sources){
		try{
			var img = sources[0].thumbnail.toPNG();
			var output_image;

			if(sub_bounds != null){
				var web_zoom = website_view.webContents.zoomFactor
				var offset_left = Math.max(Math.round(sub_bounds.left * web_zoom), 0)
				var offset_top = Math.max(Math.round(sub_bounds.top * web_zoom), 0);
				var scaled_width = Math.round(789 * web_zoom);
				var scaled_height = Math.round(532 * web_zoom);
				output_image = await sharp(img).extract({
					left: offset_left,
					top: offset_top,
					width: Math.min(scaled_width, window_bounds.width - offset_left),
					height: Math.min(scaled_height, window_bounds.height - offset_top)
				}).toBuffer();
			}else{
				output_image = img;
			}

			var screenshot_name = 'screenshot-' + Date.now() + '.png';
			fs.writeFileSync(screenshot_name, output_image);
			foxkit_view.webContents.send('screenshot-feedback', {
				type: 'success',
				img: output_image
			});
		}catch(error){
			console.log(error);
			foxkit_view.webContents.send('screenshot-feedback', { type: 'failure' });
		}
	});
}

ipcMain.on('update-banner-visibility', function(event, visible){
	Settings.webview.banner_visibility = visible;
	website_view.webContents.send('set-banner-visibility', Settings.webview.banner_visibility);
});

ipcMain.on('update-cellpadding-visibility', function(event, visible){
	Settings.webview.cellpadding_visibility = visible;
	website_view.webContents.send('set-cellpadding-visibility', Settings.webview.cellpadding_visibility);
});

ipcMain.on('update-scrollbar-visibility', function(event, visible){
	Settings.webview.scrollbar_visibility = visible;
	website_view.webContents.send('set-scrollbar-visibility', Settings.webview.scrollbar_visibility);
});
