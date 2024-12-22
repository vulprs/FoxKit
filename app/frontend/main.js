
var Settings = {
	items: {
		webview: {
			banner_visibility: {
				setting_elm: 'settingRemoveBanner',
				load: function(value){
					document.getElementById(this.setting_elm).checked = !value;
				},
				update: function(){
					var elm = document.getElementById(this.setting_elm);
					window.api.update_banner_visibility(!elm.checked);
				}
			},
			cellpadding_visibility: {
				setting_elm: 'settingRemoveClientPadding',
				load: function(value){
					document.getElementById(this.setting_elm).checked = !value;
				},
				update: function(){
					var elm = document.getElementById(this.setting_elm);
					window.api.update_cellpadding_visibility(!elm.checked);
				}
			},
			scrollbar_visibility: {
				setting_elm: 'settingHideScrollbars',
				load: function(value){
					document.getElementById(this.setting_elm).checked = !value;
				},
				update: function(){
					var elm = document.getElementById(this.setting_elm);
					window.api.update_scrollbar_visibility(!elm.checked);
				}
			}
		},
		fkview: {
			pixelated_images: {
				setting_elm: 'settingPixelatedImages',
				load: function(value){
					document.getElementById(this.setting_elm).checked = value;
					this.update();
				},
				update: function(){
					var elm = document.getElementById(this.setting_elm);
					if(elm.checked === true){
						panelWrapper.classList.add('pixelated');
					}else{
						panelWrapper.classList.remove('pixelated');
					}
				}
			}
		}
	},
	load: function(settings){
		for(var category_key in settings){
			for(var item_key in settings[category_key]){
				var elm = document.getElementById(this.items[category_key][item_key].setting_elm);
				elm.fk = {
					category: category_key,
					item: item_key
				}
				elm.addEventListener('change', function(){ Settings.items[this.fk.category][this.fk.item].update(Settings.items[this.fk.category][this.fk.item]); });
				this.items[category_key][item_key].load(settings[category_key][item_key]);
			}
		}
	}
}

var Menu = {
	display_area: document.getElementById('menuDisplayAreaWrapper'),
	selected: 'play',
	items: [
		{
			name: 'play',
			button_elm: document.getElementById('playMenuButton'),
			display_elm: document.getElementById('playDisplayArea')
		},{
			name: 'hiscores',
			button_elm: document.getElementById('hiscoresMenuButton'),
			display_elm: document.getElementById('hiscoresDisplayArea')
		},{
			name: 'settings',
			button_elm: document.getElementById('settingsMenuButton'),
			display_elm: document.getElementById('settingsDisplayArea')
		}
	],
	load: function(){
		for(var i = 0 ; i < this.items.length ; i++){
			this.items[i].button_elm.menu_item = this.items[i];
			this.items[i].button_elm.addEventListener('click', function(){
				Menu.update_selected(this.menu_item);
			});
		}
		this.update_display();
	},
	update_selected: function(item){
		if(item.name !== this.selected){
			this.selected = item.name;
		}else{
			// clicked on the same element again, collapse the menu
			this.selected = 'none';
		}
		this.update_display();
	},
	update_display: function(){
		if(this.selected === 'none'){
			// hide the side panel
			this.update_side_panel_visibility(false);
		}else{
			// ensure the side panel is visible, then display the new menu
			this.update_side_panel_visibility(true);
		}
		for(var i = 0 ; i < this.items.length ; i++){
			if(this.items[i].name === this.selected){
				this.items[i].button_elm.classList.add('menuButtonSelected');
				this.items[i].display_elm.classList.remove('hidden');
			}else{
				this.items[i].button_elm.classList.remove('menuButtonSelected');
				this.items[i].display_elm.classList.add('hidden');
			}
		}
	},
	update_side_panel_visibility: function(visible){
		if(visible === true){
			this.display_area.style.display = '';
			window.api.resize_panel_width(263);
		}else{
			this.display_area.style.display = 'none';
			window.api.resize_panel_width(30);
		}
	}
}

var Playtime = {
	start: Date.now(),
	elm: document.getElementById('playtimeDisplay'),
	interval_id: undefined,	// unused atm, but could be used to clear the `setInterval` trigger if we need to
	update: function(){
		var formatted_time = this.format_time(Date.now() - this.start);
		this.elm.innerText = formatted_time;
	},
	format_time: function(ms){
		var seconds = Math.floor(ms / 1000);
		var minutes = Math.floor(seconds / 60);
		var hours = Math.floor(minutes / 60);
		var formatted = seconds % 60;
		if(seconds % 60 < 10){ formatted = '0' + formatted; }
		formatted = minutes % 60 + ':' + formatted;
		if(minutes % 60 < 10){ formatted = '0' + formatted; }
		formatted = hours + ':' + formatted;
		if(hours < 10){ formatted = '0' + formatted; }
		return formatted;
	},
	start_counter: function(){
		this.interval_id = setInterval(function(){
			Playtime.update();
		}, 1000);
	},
	reset_counter: function(){
		this.start = Date.now();
	}
}

document.getElementById('playButton').addEventListener('click', function(event){
	window.api.load_website();
});

window.api.load_settings(function(event, settings){
	Settings.load(settings);
});

Menu.load();
Playtime.start_counter();
