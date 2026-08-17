var fs=require('fs'),f='html.js',s=fs.readFileSync(f,'utf8');
var old='\'<div class="wtag"><img src="\'+uri+\'" alt=""><span>\'+esc(m.fl||m.who)+\'</span></div>\'';
if(s.indexOf(old)<0){console.log('WTAG ANCHOR NAHI MILA');process.exit(1)}
fs.writeFileSync('html.js.bak78',s);
s=s.replace(old,'\'<div class="wtag"><span>\'+esc(m.fl||m.who)+\'</span></div>\'');
fs.writeFileSync(f,s);console.log('OK');
