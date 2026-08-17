var fs=require('fs'),f='html.js',s=fs.readFileSync(f,'utf8');
fs.writeFileSync('html.js.bak68',s);
s=s.replace('(function v65wd(){setTimeout','(function v65wd(){return;setTimeout');
var old='  window.__v64finish=finishAuth;';
if(s.indexOf(old)<0){console.log('ANCHOR NAHI MILA');process.exit(1)}
s=s.replace(old, old+'\n  setTimeout(finishAuth,2500);');
fs.writeFileSync(f,s);console.log('OK');
