/* v72 — map ka bada logo runtime par pakad kar chhota karo + BUILD chip par v72
   Chalane ka tareeqa:  cd ~/logiop-pro && node v72.js
   Backup: html.js.bak72
   NOTE: html.js template literal hai — isme jaane wali koi bhi string
   HAMESHA ek hi line mein honi chahiye, warna poori script toot jaati hai. */

var fs = require('fs');
var f = 'html.js';
var s = fs.readFileSync(f, 'utf8');

if (s.indexOf('v72fix') > -1) { console.log('v72 pehle se laga hai'); process.exit(0); }

fs.writeFileSync('html.js.bak72', s);

var js = '(function v72fix(){function shrink(){try{var host=document.querySelector(".wmap")||document.querySelector("#corrMap")||document.body;var el=host.querySelectorAll("img,svg,image");for(var i=0;i<el.length;i++){var e=el[i];var w=e.getBoundingClientRect().width;if(w>60){e.style.setProperty("width","auto","important");e.style.setProperty("height","14px","important");e.style.setProperty("max-width","28px","important");e.style.setProperty("max-height","14px","important");e.style.setProperty("object-fit","contain","important")}}var c=document.querySelectorAll(".chip");for(var k=0;k<c.length;k++){if(/BUILD/i.test(c[k].textContent))c[k].textContent="BUILD v72"}}catch(e){}}var n=0;var t=setInterval(function(){shrink();if(++n>20)clearInterval(t)},700);setTimeout(shrink,400);document.addEventListener("click",function(){setTimeout(shrink,300)},true)})();';

var block = '\n/* ---------- v72 map logo runtime fix ---------- */\n' + js + '\n';

var i = s.lastIndexOf('<\/script>');
if (i < 0) { console.log('ERROR: script tag nahi mila'); process.exit(1); }

fs.writeFileSync(f, s.slice(0, i) + block + s.slice(i));
console.log('OK — v72 laga. Backup: html.js.bak72');
