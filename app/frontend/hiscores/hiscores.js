
var xp_table = [83,174,276,388,512,650,801,969,1154,1358,1584,1833,2107,2411,2746,3115,3523,3973,4470,5018,5624,6291,7028,7842,8740,9730,10824,12031,13363,14833,16456,18247,20224,22406,24815,27473,30408,33648,37224,41171,45529,50339,55649,61512,67983,75127,83014,91721,101333,111945,123660,136594,150872,166636,184040,203254,224466,247886,273742,302288,333804,368599,407015,449428,496254,547953,605032,668051,737627,814445,899257,992895,1096278,1210421,1336443,1475581,1629200,1798808,1986068,2192818,2421087,2673114,2951373,3258594,3597792,3972294,4385776,4842295,5346332,5902831,6517253,7195629,7944614,8771558,9684577,10692629,11805606,13034431,14391160,15889109,17542976,19368992,21385073,23611006,26068632,28782069,31777943,35085654,38737661,42769801,47221641,52136869,57563718,63555443,70170840,77474828,85539082,94442737,104273167,115126838,127110260,140341028,154948977,171077457,188884740,208545572];
var Hiscores = {};

var name_field = document.getElementById('hiscoresUsernameInput');
name_field.addEventListener('keydown', function(event){
	if(event.key === 'Enter'){
		Hiscores.fetch(event.srcElement.value);
	}
});
name_field.addEventListener('dblclick', function(event){
	Hiscores.fetch('Vulpi');
});

var skill_elms = document.getElementById('hiscoresSkillsArea').children;
for(var i = 0 ; i < skill_elms.length ; i++){
	skill_elms[i].addEventListener('mouseover', function(){
		Hiscores.set_skill_details(parseInt(this.dataset.index));
	});
	skill_elms[i].addEventListener('mouseout', function(){
		Hiscores.clear_skill_details();
	});
}
document.getElementById('hiscoreDetailOverall').addEventListener('mouseover', function(){
	Hiscores.set_skill_details(0);
});
document.getElementById('hiscoreDetailOverall').addEventListener('mouseout', function(){
	Hiscores.clear_skill_details();
});


Hiscores.fetch = function(name){
	// there's no API to test with currently, so for now we'll just do a hacky mock up
	if(name === 'Lynx Titan'){
		// using `https://secure.runescape.com/m=hiscore_oldschool/index_lite.ws?player=Lynx+Titan` as a reference
		Hiscores.player = Hiscores.format_stats(name, '1,2277,4600000000 15,99,200000000 28,99,200000000 18,99,200000000 7,99,200000000 8,99,200000000 11,99,200000000 30,99,200000000 149,99,200000000 15,99,200000000 12,99,200000000 9,99,200000000 48,99,200000000 4,99,200000000 3,99,200000000 23,99,200000000 5,99,200000000 24,99,200000000 12,99,200000000 2,99,200000000');
	}else if(name === 'Vulpi'){
		Hiscores.player = Hiscores.format_stats(name, '-1,1336,23044367 -1,65,457002 -1,78,1638209 -1,67,592589 -1,71,831525 -1,70,740825 -1,62,347999 -1,65,449436 -1,58,226047 -1,77,1534743 -1,84,3076662 -1,75,1222193 -1,80,2006202 -1,61,316560 -1,58,228668 -1,88,4500425 -1,72,953474 -1,60,282685 -1,85,3365342 -1,60,273781');
	}else{
		Hiscores.player = null;
	}
	Hiscores.update_display();
}

Hiscores.update_display = function(){
	name_field.value = (Hiscores.player != null ? Hiscores.player.name : '');

	for(var i = 0 ; i < 19 ; i++){
		skill_elms[i].children[1].innerText = (Hiscores.player != null ? Hiscores.player.stats[i + 1][1] : '');
	}

	document.getElementById('hiscoreDetailOverall').innerText = (Hiscores.player != null ? 'Overall: ' + Hiscores.player.stats[0][1] : 'Overall:');

	var combat_level = '';
	if(Hiscores.player != null){
		// https://oldschool.runescape.wiki/w/Combat_level#Calculating_combat_level

		var base_combat_level = Math.floor(Hiscores.player.stats[13][1] / 2);
		base_combat_level += Hiscores.player.stats[2][1];
		base_combat_level += Hiscores.player.stats[7][1];
		base_combat_level *= 0.25;

		var melee_combat_level = Hiscores.player.stats[4][1];
		melee_combat_level += Hiscores.player.stats[1][1];
		melee_combat_level *= 0.325;

		var magic_combat_level = Math.floor(Hiscores.player.stats[16][1] / 2);
		magic_combat_level += Hiscores.player.stats[16][1];
		magic_combat_level *= 0.325;

		var ranged_combat_level = Math.floor(Hiscores.player.stats[10][1] / 2);
		ranged_combat_level += Hiscores.player.stats[10][1];
		ranged_combat_level *= 0.325;

		combat_level = JSON.parse((base_combat_level + Math.max(melee_combat_level, magic_combat_level, ranged_combat_level)).toFixed(3));
	}
	document.getElementById('hiscoreDetailCombat').innerText = 'Combat: ' + combat_level;
}

Hiscores.format_stats = function(name, stats){
	var formatted_stats = [];
	var skills = stats.split(' ');

	for(var i = 0 ; i < skills.length ; i++){
		var skill = skills[i].split(',');
		formatted_stats.push([
			parseInt(skill[0]), // rank
			parseInt(skill[1]),	// level
			parseInt(skill[2])	// xp
		]);
	}
	return {
		name: name,
		stats: formatted_stats
	}
}

Hiscores.set_skill_details = function(index){
	if(Hiscores.player != null){
		document.getElementById('hiscoreDetailRank').innerText = 'Rank: ' + add_commas(Hiscores.player.stats[index][0]);
		document.getElementById('hiscoreDetailXp').innerText = 'Experience: ' + add_commas(Hiscores.player.stats[index][2]);
		if(index > 0){
			var xp_details = Hiscores.get_xp_details(Hiscores.player.stats[index][2]);
			var xp_to_level = xp_details.next - xp_details.current;
			var xp_needed_for_level = xp_details.next - xp_details.previous;
			var xp_gained_towards_level = xp_needed_for_level - xp_to_level;
			var percentage = (xp_gained_towards_level / xp_needed_for_level) * 100;
			document.getElementById('hiscoreDetailXpToLevel').innerText = 'XP to level: ' + add_commas(xp_to_level);
			document.getElementById('hiscoreDetailProgressBar').style.width = JSON.parse(percentage.toFixed(1)) + '%';
			document.getElementById('hiscoreDetailProgressBarText').innerText = JSON.parse(percentage.toFixed(1)) + '%';
			document.getElementById('hiscoreDetailProgressBarContainer').style.opacity = 1;
		}
	}
}

Hiscores.clear_skill_details = function(){
	document.getElementById('hiscoreDetailRank').innerText = 'Rank:';
	document.getElementById('hiscoreDetailXp').innerText = 'Experience:';
	document.getElementById('hiscoreDetailXpToLevel').innerText = 'XP to level:';
	document.getElementById('hiscoreDetailProgressBarContainer').style.opacity = 0;
}

Hiscores.get_virtual_level_from_xp = function(xp){
	var level = 0;
	for(var i = 0 ; i < xp_table.length ; i++){
		if(xp < xp_table[i]){
			level = i + 1;
			i = Infinity;
		}
	}
	return level;
}

Hiscores.get_xp_details = function(xp){
	var virtual_level = Hiscores.get_virtual_level_from_xp(xp);
	return {
		previous: xp_table[virtual_level - 2],
		current: xp,
		next: xp_table[virtual_level - 1]
	}
}

function add_commas(x){
	return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ',');
}
