/* v76 — do kaam:
   1) BUILD chip par sach much ka version likho (class dekhe bina — jo bhi
      element "BUILD v<number>" dikha raha ho, uska text badal do). Isse aage
      turant pata chalega ki patch app tak pahuncha ya nahi.
   2) Map ke andar jo bhi image/svg bada mile use chhota karo — class ka
      andaza lagana band, seedha size dekh kar pakdo.

   Chalane ka tareeqa:  cd ~/logiop-pro && node v76.js
   Backup: html.js.bak76

   NOTE: html.js template literal hai — isme jaane wali koi bhi string
   HAMESHA ek hi line mein honi chahiye, warna poori script toot jaati hai. */

var fs = require('fs');
var f = 'html.js';
var s = fs.readFileSync(f, 'utf8');

if (s.indexOf('v76stamp') > -1) { console.log('v76 pehle se laga hai'); process.exit(0); }

fs.writeFileSync('html.js.bak76', s);

var js = '(function v76stamp(){var VER="v76";function work(){try{var all=document.querySelectorAll("span,div,b,small,em,button,a");for(var i=0;i<all.length;i++){var e=all[i];if(e.children.length===0&&/^\\s*BUILD\\s*v\\d+\\s*$/i.test(e.textContent)){e.textContent="BUILD "+VER}}}catch(e){}try{var host=document.querySelector(".wmap")||document.querySelector("#corrMap")||document.body;var el=host.querySelectorAll("img,svg,image");for(var k=0;k<el.length;k++){var x=el[k];if(x.getBoundingClientRect().width>60){x.style.setProperty("width","auto","important");x.style.setProperty("height","14px","important");x.style.setProperty("max-width","28px","important");x.style.setProperty("max-height","14px","important");x.style.setProperty("object-fit","contain","important")}}}catch(e){}}var n=0;var t=setInterval(function(){work();if(++n>25)clearInterval(t)},600);setTimeout(work,300);document.addEventListener("click",function(){setTimeout(work,250)},true)})();';

var block = '\n/* ---------- v76 stamp + map logo ---------- */\n' + js + '\n';

var i = s.lastIndexOf('<\/script>');
if (i < 0) { console.log('ERROR: script tag nahi mila'); process.exit(1); }

fs.writeFileSync(f, s.slice(0, i) + block + s.slice(i));
console.log('OK — v76 laga. Backup: html.js.bak76');
