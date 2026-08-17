var fs=require('fs'), f='html.js';
var s=fs.readFileSync(f,'utf8');
if(s.indexOf('v64css')>-1){console.log('v64 pehle se laga hai');process.exit(0);}
fs.writeFileSync('html.js.bak64',s);
var css=[
'.finb{display:inline-flex!important;align-items:center!important;gap:6px!important;vertical-align:middle!important}',
'.fin2{display:inline-block!important;width:auto!important;height:var(--h,22px)!important;',
'background:none!important;border:0!important;box-shadow:none!important;padding:0!important;border-radius:0!important;',
'clip-path:none!important;-webkit-clip-path:none!important;mask:none!important;-webkit-mask:none!important;',
'transform:none!important;overflow:visible!important}',
'.fin2::before,.fin2::after{display:none!important;content:none!important}',
'.fin2 img{width:auto!important;height:100%!important;max-width:44px!important;object-fit:contain!important;display:block!important;filter:none!important}',
'.fno{font-size:11px!important;font-weight:700!important;letter-spacing:.3px!important;line-height:1!important;white-space:nowrap!important}',
'#corrLegend{display:flex!important;flex-wrap:wrap!important;align-items:center!important;gap:8px 10px!important}',
'#corrLegend>span{background:rgba(255,255,255,.04)!important;border:1px solid rgba(255,255,255,.09)!important;',
'border-radius:999px!important;padding:5px 11px!important;font-size:11px!important;white-space:nowrap!important}',
'.wpl .ac{width:34px!important;height:34px!important}',
'.wpl .wtag{display:inline-flex!important;align-items:center!important;gap:4px!important;',
'font-size:9px!important;line-height:1!important;white-space:nowrap!important;padding:2px 6px!important;border-radius:999px!important}',
'.wpl .wtag img{width:auto!important;height:13px!important;max-width:26px!important;object-fit:contain!important;flex:0 0 auto!important}'
].join('');
var block='\n/* ---------- v64: plain airline logo + map logo size ---------- */\n'+
'(function(){try{var st=document.createElement("style");st.id="v64css";st.textContent='+
JSON.stringify(css)+';document.head.appendChild(st);}catch(e){}})();\n';
var i=s.lastIndexOf('<\/script>');
if(i<0){console.log('ERROR: script tag nahi mila');process.exit(1);}
fs.writeFileSync(f,s.slice(0,i)+block+s.slice(i));
console.log('v64 laga — backup: html.js.bak64');
