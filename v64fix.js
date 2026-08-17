var fs=require('fs'),f='html.js',s=fs.readFileSync(f,'utf8');
if(/v64logo/.test(s)){console.log('pehle se laga');process.exit(0);}
fs.writeFileSync('html.js.bak65',s);
var css=fs.readFileSync('v64.css','utf8');
var b='\n/* ---------- v64 airline logo ---------- */\n(function(){try{var t=document.createElement("style");t.id="v64logo";t.textContent='+JSON.stringify(css)+';document.head.appendChild(t)}catch(e){}})();\n';
var i=s.lastIndexOf('<\/script>');
fs.writeFileSync(f,s.slice(0,i)+b+s.slice(i));
console.log('OK');
