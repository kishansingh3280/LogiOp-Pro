var fs=require('fs'),f='html.js',s=fs.readFileSync(f,'utf8');
if(/v65wd/.test(s)){console.log('pehle se');process.exit(0)}
var b='\n/* --------- v65 boot watchdog --------- */\n(function v65wd(){setTimeout(function(){try{if(window.__v64finish)window.__v64finish()}catch(e){}},6000)})();\n';
var i=s.lastIndexOf('<\/script>');
fs.writeFileSync(f,s.slice(0,i)+b+s.slice(i));
console.log('OK');
