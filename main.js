const { app, BaseWindow, WebContentsView, ipcMain, session, desktopCapturer, dialog } = require('electron/main');
const process = require('node:process');
const path = require('node:path');
const fs = require('node:fs');
const sharp = require('sharp');
const homedir = require('os').homedir();

var main_window;
var website_view;
var foxkit_view;
var side_panel_width = 263;
var foxkit_dir = '.foxkit';

var Settings;


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

function load_settings(){
	if(homedir == null || homedir.length <= 0){
		console.error("Couldn't find a valid home directory..?" + '\n' + homedir);
		process.exit(1);
	}else{

		// first lets check if a `.foxkit` directory already exists on the system
		var fkd = path.join(homedir, foxkit_dir);
		if(fs.existsSync(fkd) === false){
			console.log('Settings directory not found, creating..');
			fs.mkdirSync(fkd);
			fs.mkdirSync(path.join(fkd, 'screenshots'));
			console.log('Settings directory created at: ' + fkd);
		}

		// now we'll check for a settings file
		var settings_file_path = path.join(fkd, 'profiles', 'default.json');
		if(fs.existsSync(settings_file_path) === false){
			// no settings file to load, use default settings instead
			Settings = get_default_settings();
		}else{
			console.log('Loading settings from: ' + settings_file_path);
			try{
				// it's possible that FoxKit has updated and added new default settings
				// we should attempt to merge these settings with the default settings to ensure that it stays up to date
				Settings = merge_settings_with_defaults(JSON.parse(fs.readFileSync(settings_file_path)));
			}catch(error){
				console.error(error);
				console.error('Error while attempting to load settings file: `' + settings_file_path + '`'
					+ '\nEnsure that the JSON is valid, or simply delete the file to reset all settings.');
				process.exit(2);
			}
		}
	}
}

function update_setting(type, key, value){
	foxkit_view.webContents.send('update-setting', type, key, value);
}

function create_window(){

	main_window = new BaseWindow({
		minWidth: 819,
		minHeight: 532,
		width: 1079,
		height: 532,
		icon: path.join(__dirname, 'icon.png')
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

	load_website('https://2004.lostcity.rs/title');
}

function load_website(url){
	if(developer_mode === true){
		website_view.webContents.loadURL('http://localhost:' + global.DEV_SERVER_PORT);
	}else{
		website_view.webContents.loadURL(url);
	}
}

app.whenReady().then(function(){
	load_settings();
	setup_session();
	create_window();
	app.on('activate', function(){
		if(BaseWindow.getAllWindows().length === 0){
			create_window();
		}
	});
});

app.on('window-all-closed', function(){
	app.quit();
});

function setup_session(){
	var regex_trusted_hosts = [
		/^file:\/\/\//,                                         // this matches local files like `file:///etc/example.png`
		/^http:\/\/localhost:[0-9]+/,                           // this matches local files like `http://localhost:12345/example.png`
		/^devtools:\/\/devtools\//,                             // this matches the devtools that are used when opening the developer console in electron
		/^https:\/\/2004.lostcity.rs\//,                        // match the main website
		/^https:\/\/w[0-9]+.[0-9]+.2004scape.org(:[0-9]+)?\//,  // this will match http traffic for any combination of worlds/revs/ports
		/^wss:\/\/w[0-9]+.[0-9]+.2004scape.org:[0-9]+\//        // this will match web socket connections for any combination of worlds/revs/ports
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
			if(Settings.fkview.screenshot_entire_window === true){
				take_screenshot();
			}else{
				website_view.webContents.send('request-gameframe-position-for-screenshot');
			}
		}else if(input.type === 'keyUp' && input.control && input.key === '0'){
			// Ctrl+0 - reset zoom for the selected view
			view_set_zoom(this, 1);
		}else if(input.type === 'keyUp' && input.control && input.shift && input.key.toLowerCase() === 'i'){
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

ipcMain.on('load-website', function(event, url){
	load_website(url);
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
			var screenshot_path = path.join(Settings.fkview.screenshot_save_location, screenshot_name);
			fs.writeFileSync(screenshot_path, output_image);
			foxkit_view.webContents.send('screenshot-feedback', {
				type: 'success',
				img: output_image
			});
		}catch(error){
			console.error(error);
			foxkit_view.webContents.send('screenshot-feedback', { type: 'failure' });
		}
	});
}

function get_default_settings(){
	return {
		webview: {
			banner_visibility: true,
			cellpadding_visibility: true,
			scrollbar_visibility: true
		},
		fkview: {
			pixelated_images: false,
			screenshot_entire_window: false,
			screenshot_save_location: path.join(homedir, foxkit_dir, 'screenshots')
		}
	};
}

function merge_settings_with_defaults(settings){
	var default_settings = get_default_settings();
	for(var category in default_settings){
		// ensure the category exists
		if(settings[category] === undefined){
			settings[category] = {};
		}
		for(var setting in default_settings[category]){
			if(settings[category][setting] === undefined){
				// found an undefined setting, lets merge the default setting in
				settings[category][setting] = default_settings[category][setting];
			}
		}
	}
	return settings;
}

function save_settings(){
	// first lets make sure the path `.foxkit/profiles` exists
	var profiles_path = path.join(homedir, foxkit_dir, 'profiles');
	if(fs.existsSync(profiles_path) === false){
		fs.mkdirSync(profiles_path, { recursive: true });
	}
	// then we'll write the settings to disk
	var filename = path.join(profiles_path, 'default.json');
	var formatted_settings = JSON.stringify(Settings, null, 2);
	fs.writeFileSync(filename, formatted_settings);
}

async function choose_screenshot_save_location(){
	var result = await dialog.showOpenDialog({ properties: ['openDirectory', 'showHiddenFiles'] });
	if(result.canceled === false){
		Settings.fkview.screenshot_save_location = result.filePaths[0];
		save_settings();
	}
}

ipcMain.on('update-banner-visibility', function(event, visible){
	Settings.webview.banner_visibility = visible;
	website_view.webContents.send('set-banner-visibility', Settings.webview.banner_visibility);
	save_settings();
});

ipcMain.on('update-cellpadding-visibility', function(event, visible){
	Settings.webview.cellpadding_visibility = visible;
	website_view.webContents.send('set-cellpadding-visibility', Settings.webview.cellpadding_visibility);
	save_settings();
});

ipcMain.on('update-scrollbar-visibility', function(event, visible){
	Settings.webview.scrollbar_visibility = visible;
	website_view.webContents.send('set-scrollbar-visibility', Settings.webview.scrollbar_visibility);
	save_settings();
});

ipcMain.on('update-fkview-setting', function(event, key, value){
	Settings.fkview[key] = value;
	save_settings();
});

ipcMain.on('update-screenshot-save-location', async function(event, options){
	if(options != null && options.type === 'path'){
		Settings.fkview.screenshot_save_location = options.path;
		save_settings();
	}else{
		await choose_screenshot_save_location();
	}
	update_setting('fkview', 'screenshot_save_location', Settings.fkview.screenshot_save_location);
});
