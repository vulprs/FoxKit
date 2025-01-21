
document.getElementById('worldDisplayArea').addEventListener('click', function(event){
	if(event.target && event.target.matches("input[type='radio']")){
		if(event.target.value === 'hd-w1'){
			window.api.load_website('https://2004.lostcity.rs/client?world=1&detail=high&method=0');
		}else if(event.target.value === 'hd-w2'){
			window.api.load_website('https://2004.lostcity.rs/client?world=2&detail=high&method=0');
		}else if(event.target.value === 'hd-w3'){
			window.api.load_website('https://2004.lostcity.rs/client?world=3&detail=high&method=0');
		}else if(event.target.value === 'hd-w4'){
			window.api.load_website('https://2004.lostcity.rs/client?world=4&detail=high&method=0');
		}else if(event.target.value === 'hd-w5'){
			window.api.load_website('https://2004.lostcity.rs/client?world=5&detail=high&method=0');
		}else if(event.target.value === 'hd-w6'){
			window.api.load_website('https://2004.lostcity.rs/client?world=6&detail=high&method=0');
		}else if(event.target.value === 'ld-w1'){
			window.api.load_website('https://2004.lostcity.rs/client?world=1&detail=low&method=0');
		}else if(event.target.value === 'ld-w2'){
			window.api.load_website('https://2004.lostcity.rs/client?world=2&detail=low&method=0');
		}else if(event.target.value === 'ld-w3'){
			window.api.load_website('https://2004.lostcity.rs/client?world=3&detail=low&method=0');
		}else if(event.target.value === 'ld-w4'){
			window.api.load_website('https://2004.lostcity.rs/client?world=4&detail=low&method=0');
		}else if(event.target.value === 'ld-w5'){
			window.api.load_website('https://2004.lostcity.rs/client?world=5&detail=low&method=0');
		}else if(event.target.value === 'ld-w6'){
			window.api.load_website('https://2004.lostcity.rs/client?world=6&detail=low&method=0');
		}
	}
});
