
var Settings = {};

Settings.items = {
	webview: {
		banner_visibility: {
			setting_elm: 'settingRemoveBanner',
			load: function(value){ document.getElementById(this.setting_elm).checked = !value; },
			update: function(){ window.api.update_banner_visibility(!document.getElementById(this.setting_elm).checked); }
		},
		cellpadding_visibility: {
			setting_elm: 'settingRemoveClientPadding',
			load: function(value){ document.getElementById(this.setting_elm).checked = !value; },
			update: function(){ window.api.update_cellpadding_visibility(!document.getElementById(this.setting_elm).checked); }
		},
		scrollbar_visibility: {
			setting_elm: 'settingHideScrollbars',
			load: function(value){ document.getElementById(this.setting_elm).checked = !value; },
			update: function(){ window.api.update_scrollbar_visibility(!document.getElementById(this.setting_elm).checked); }
		}
	},
	fkview: {
		pixelated_images: {
			setting_elm: 'settingPixelatedImages',
			load: function(value){ document.getElementById(this.setting_elm).checked = value; this.update(); },
			update: function(){
				if(document.getElementById(this.setting_elm).checked === true){
					document.getElementById('panelWrapper').classList.add('pixelated');
					window.api.update_fkview_setting('pixelated_images', true);
				}else{
					document.getElementById('panelWrapper').classList.remove('pixelated');
					window.api.update_fkview_setting('pixelated_images', false);
				}
			}
		},
		screenshot_entire_window: {
			setting_elm: 'settingScreenshotEntireWindow',
			load: function(value){ document.getElementById(this.setting_elm).checked = value; },
			update: function(){
				window.api.update_fkview_setting('screenshot_entire_window', document.getElementById(this.setting_elm).checked);
			}
		},
		screenshot_save_location: {
			setting_elm: 'settingScreenshotPath',
			load: function(value){ document.getElementById(this.setting_elm).value = value; },
			update: function(){
				window.api.update_screenshot_save_location({
					type: 'path',
					path: document.getElementById(this.setting_elm).value
				});
			}
		}
	}
}

Settings.load = function(settings){
	for(var category_key in settings){
		for(var item_key in settings[category_key]){
			if(this.items[category_key][item_key] === undefined){
				console.log('Tried to load unrecognized setting: ' + category_key + '.' + item_key);
			}else{
				var elm = document.getElementById(this.items[category_key][item_key].setting_elm);
				elm.fk = {
					category: category_key,
					item: item_key
				}
				elm.addEventListener('change', function(){ Settings.items[this.fk.category][this.fk.item].update(); });
				this.items[category_key][item_key].load(settings[category_key][item_key]);
			}
		}
	}
}

document.getElementById('settingScreenshotPathButton').addEventListener('click', function(event){
	window.api.update_screenshot_save_location();
});

window.api.load_settings(function(event, settings){
	Settings.load(settings);
});

window.api.update_setting(function(event, type, key, value){
	document.getElementById(Settings.items[type][key].setting_elm).value = value;
});
