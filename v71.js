/* v71 — map ka bada airline logo chhota karo
   Chalane ka tareeqa:  cd ~/logiop-pro && node v71.js
   Ye purani file ka backup html.js.bak71 mein rakh deta hai. */

var fs = require('fs');
var f = 'html.js';
var s = fs.readFileSync(f, 'utf8');

if (s.indexOf('v71map') > -1) { console.log('v71 pehle se laga hai'); process.exit(0); }

fs.writeFileSync('html.js.bak71', s);

/* NOTE: ye CSS ek hi line mein hai — html.js template literal hai,
   isme multi-line string kabhi mat daalna, warna poori script toot jaati hai. */
var css = '.wmap img,.wmap .wtag img,.wpl img{max-width:26px!important;max-height:14px!important;width:auto!important;height:13px!important;object-fit:contain!important;display:inline-block!important}.wmap svg.ac,.wpl svg.ac{width:34px!important;height:34px!important}.wmap .wpl{max-width:64px!important;overflow:visible!important}.wmap .wtag{display:inline-flex!important;align-items:center!important;gap:4px!important;font-size:9px!important;line-height:1!important;white-space:nowrap!important;padding:2px 6px!important;border-radius:999px!important}';

var block = '\n/* ---------- v71 map logo cap ---------- */\n(function(){try{var t=document.createElement("style");t.id="v71map";t.textContent=' + JSON.stringify(css) + ';document.head.appendChild(t)}catch(e){}})();\n';

var i = s.lastIndexOf('<\/script>');
if (i < 0) { console.log('ERROR: script tag nahi mila'); process.exit(1); }

fs.writeFileSync(f, s.slice(0, i) + block + s.slice(i));
console.log('OK — v71 laga. Backup: html.js.bak71');
