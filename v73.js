/* v73 — "data 0" fix
   App khulte hi kuch cards 0 dikhte hain (Treasury 0 gm, corridor 0,
   Parties 0 active, Shipments 0 bags). Data maujood hai — render boot ke
   dauran chal kar 0 par atak jaata hai. Ye patch load ke baad renderAll +
   countUp dobara chalata hai, aur section badalne par bhi.

   Chalane ka tareeqa:  cd ~/logiop-pro && node v73.js
   Backup: html.js.bak73

   NOTE: html.js template literal hai — isme jaane wali koi bhi string
   HAMESHA ek hi line mein honi chahiye, warna poori script toot jaati hai. */

var fs = require('fs');
var f = 'html.js';
var s = fs.readFileSync(f, 'utf8');

if (s.indexOf('v73data') > -1) { console.log('v73 pehle se laga hai'); process.exit(0); }

fs.writeFileSync('html.js.bak73', s);

var js = '(function v73data(){function go(){try{if(typeof renderAll==="function")renderAll()}catch(e){}try{if(typeof countUp==="function")countUp()}catch(e){}}var n=0;var t=setInterval(function(){go();if(++n>8)clearInterval(t)},600);setTimeout(go,300);setTimeout(go,1500);setTimeout(go,3000);document.addEventListener("click",function(){setTimeout(go,250)},true);document.addEventListener("visibilitychange",function(){if(!document.hidden)setTimeout(go,250)})})();';

var block = '\n/* ---------- v73 data 0 fix ---------- */\n' + js + '\n';

var i = s.lastIndexOf('<\/script>');
if (i < 0) { console.log('ERROR: script tag nahi mila'); process.exit(1); }

fs.writeFileSync(f, s.slice(0, i) + block + s.slice(i));
console.log('OK — v73 laga. Backup: html.js.bak73');
