var fs=require('fs'),f='html.js',s=fs.readFileSync(f,'utf8');
fs.writeFileSync('html.js.bak70',s);
var a=s.indexOf('/* ---------- v64 airline logo ---------- */');
if(a<0){console.log('BLOCK NAHI MILA');process.exit(1)}
var b=s.indexOf('})();',a);
var css='.finb{display:inline-flex!important;align-items:center!important;gap:6px!important;vertical-align:middle!important}.fin2{all:unset!important;display:inline-block!important;height:var(--h,22px)!important}.fin2::before,.fin2::after{display:none!important;content:none!important}.fin2 img{width:auto!important;height:100%!important;max-width:44px!important;object-fit:contain!important;display:block!important}.fno{font-size:11px!important;font-weight:700!important;line-height:1!important;white-space:nowrap!important}.wpl .ac{width:34px!important;height:34px!important}.wpl .wtag img{width:auto!important;height:13px!important;max-width:26px!important;object-fit:contain!important}';
var blk='/* ---------- v64 airline logo ---------- */\n(function(){try{var t=document.createElement("style");t.id="v64logo";t.textContent='+JSON.stringify(css)+';document.head.appendChild(t)}catch(e){}})();';
s=s.slice(0,a)+blk+s.slice(b+5);
fs.writeFileSync(f,s);console.log('FIXED');
