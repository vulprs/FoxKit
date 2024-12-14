const { contextBridge, ipcRenderer } = require('electron');

var game_frame;
var screenshot_success_audio;
var screenshot_failure_audio;

contextBridge.exposeInMainWorld('api', {
	load_settings: function(settings){
		ipcRenderer.on('load-settings', settings);
	},
	load_website: function(){
		ipcRenderer.send('load-website');
	},
	resize_panel_width: function(width){
		ipcRenderer.send('resize-panel-width', width);
	},
	update_banner_visibility: function(visible){
		ipcRenderer.send('update-banner-visibility', visible);
	},
	update_cellpadding_visibility: function(visible){
		ipcRenderer.send('update-cellpadding-visibility', visible);
	},
	update_scrollbar_visibility: function(visible){
		ipcRenderer.send('update-scrollbar-visibility', visible);
	}
});

window.onload = function(){
	game_frame = document.getElementsByTagName('iframe')[0];
	screenshot_success_audio = document.getElementById('screenshotSuccessAudio');
	screenshot_failure_audio = document.getElementById('screenshotFailureAudio');
	add_custom_css();
	ipcRenderer.send('view-loaded', document.body.id);
}

ipcRenderer.on('set-banner-visibility', function(event, visible){
	if(check_webclient_page() === true){
		document.getElementsByTagName('tr')[0].style.display = (visible ? '' : 'none');
	}
});

var original_cellpadding;
ipcRenderer.on('set-cellpadding-visibility', function(event, visible){
	if(check_webclient_page() === true){
		var elm = document.getElementsByTagName('table')[0];
		if(original_cellpadding === undefined){
			original_cellpadding = elm.cellPadding;
		}
		elm.cellPadding = (visible ? original_cellpadding : 0);
	}
});

ipcRenderer.on('set-scrollbar-visibility', function(event, visible){
	if(check_webclient_page() === true){
		if(visible){
			document.body.classList.remove('invisible-scrollbar');
		}else{
			document.body.classList.add('invisible-scrollbar');
		}
	}
});

function add_custom_css(){
	document.styleSheets[0].insertRule('.invisible-scrollbar::-webkit-scrollbar{ display: none; }', 0);
}

function check_webclient_page(){
	var regex_matching_urls = [
		/^https:\/\/www.2004scape.org\/client\?world=[0-9]+&detail=(low|high)&method=[0-9]+/,	// should match any webclient page
		/^http:\/\/localhost:[0-9]+/															// matches our local test page
	];
	return regex_matching_urls.some(function(rx){
		return rx.test(window.location.href);
	});
}

ipcRenderer.on('zoom-display', function(event, data){
	if(data.silent === false){
		// clear previous display if there is one
		remove_element(document.getElementById('fkZoomDisplay'));

		var formatted_zoom = Math.round(data.zoom * 100);

		// create and add new display
		var display_elm = document.createElement('div');
		display_elm.id = 'fkZoomDisplay';
		display_elm.style.position = 'fixed';
		display_elm.innerText = formatted_zoom + '%';
		display_elm.style.top = 0;
		display_elm.style.left = 0;
		display_elm.style.scale = (1 / data.zoom);
		display_elm.style.transformOrigin = 'top left';
		display_elm.style.color = 'black';
		display_elm.style.backgroundColor = 'white';
		display_elm.style.padding = '4px';
		display_elm.style.opacity = 0.8;
		display_elm.style.fontSize = '15px';
		document.body.appendChild(display_elm);

		// remove the display after 1 second
		setTimeout(function(){ remove_element(display_elm); }, 1000);
	}
});

function remove_element(elm){
	if(elm != null && elm.parentElement != null){
		elm.parentElement.removeChild(elm);
	}
}

ipcRenderer.on('request-gameframe-position-for-screenshot', async function(){
	var offset;
	if(game_frame != null){
		var frame_bounds = game_frame.getBoundingClientRect();
		offset = {
			left: frame_bounds.left,
			top: frame_bounds.top,
		};
	}
	ipcRenderer.send('gameframe-position-for-screenshot', { offset: offset });
});

ipcRenderer.on('screenshot-feedback', function(event, data){
	if(data.type === 'success'){
		play_audio(screenshot_success_audio);
		// display thumbnail
		console.log(data.img.length);
	}else if(data.type === 'failure'){
		play_audio(screenshot_failure_audio);
	}
});

function play_audio(audio_elm){
	if(!audio_elm.paused){
		// reset the sound file if it's already playing
		audio_elm.pause();
		audio_elm.currentTime = 0;
	}
	audio_elm.play();
}