/* v79 — corridor map ki gayab CSS wapas

   Jad: map ke andar ke elements (.wnode, .wpl, .wcred) ko position mil hi
   nahi raha tha, isliye DEL/CCU/BKK/TG-314 sab plain text ki tarah ek ke
   neeche ek beh gaye, aur plane ka SVG bina kisi seema ke phail gaya —
   wahi bada safed-laal cheez thi.

   Fix: map ka poora layout CSS wapas inject.

   Chalane ka tareeqa:  cd ~/logiop-pro && node v79.js
   Backup: html.js.bak79

   NOTE: html.js template literal hai — string HAMESHA ek line mein. */

var fs = require('fs');
var f = 'html.js';
var s = fs.readFileSync(f, 'utf8');

if (s.indexOf('v79map') > -1) { console.log('v79 pehle se laga hai'); process.exit(0); }

fs.writeFileSync('html.js.bak79', s);

var css = '.wmap{position:relative!important;width:100%!important;height:100%!important;min-height:280px!important;overflow:hidden!important;border-radius:14px!important}.wland{position:absolute!important;inset:0!important;pointer-events:none!important}.wsvg{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;display:block!important}.wroute{fill:none!important;stroke:url(#wgr)!important;stroke-width:2!important;stroke-dasharray:5 5!important;opacity:.85!important}.wnode{position:absolute!important;transform:translate(-50%,-50%)!important;display:inline-flex!important;align-items:center!important;gap:5px!important;font-size:10px!important;white-space:nowrap!important;z-index:3!important}.wnode i{display:block!important;width:9px!important;height:9px!important;border-radius:50%!important;background:currentColor!important;box-shadow:0 0 12px currentColor!important;flex:0 0 auto!important}.wnode b{font-size:11px!important;letter-spacing:.5px!important;font-weight:700!important}.wpl{position:absolute!important;transform:translate(-50%,-50%)!important;display:flex!important;flex-direction:column!important;align-items:center!important;gap:2px!important;z-index:4!important;pointer-events:none!important}.wpl svg.ac{width:26px!important;height:26px!important;display:block!important;flex:0 0 auto!important}.wtag{display:inline-flex!important;align-items:center!important;gap:4px!important;font-size:9px!important;line-height:1!important;padding:2px 6px!important;border-radius:999px!important;background:rgba(255,255,255,.10)!important;white-space:nowrap!important}.wtag img{width:auto!important;height:12px!important;max-width:24px!important;object-fit:contain!important}.wcred{position:absolute!important;right:8px!important;bottom:6px!important;font-size:9px!important;opacity:.45!important;z-index:2!important}';

var block = '\n/* ---------- v79 map layout css ---------- */\n(function(){try{var t=document.createElement("style");t.id="v79map";t.textContent=' + JSON.stringify(css) + ';document.head.appendChild(t)}catch(e){}})();\n';

var i = s.lastIndexOf('<\/script>');
if (i < 0) { console.log('ERROR: script tag nahi mila'); process.exit(1); }

fs.writeFileSync(f, s.slice(0, i) + block + s.slice(i));
console.log('OK — v79 laga. Backup: html.js.bak79');
