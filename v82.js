var fs=require('fs'),f='html.js',s=fs.readFileSync(f,'utf8');
if(s.indexOf('v82boot')>-1){console.log('pehle se');process.exit(0)}
var old='function runBootCinema(){';
if(s.indexOf(old)<0){console.log('ANCHOR NAHI MILA');process.exit(1)}
fs.writeFileSync('html.js.bak82',s);
var neu=old+'/*v82boot*/try{var b=document.getElementById("boot");if(b){b.style.display="none";b.remove()}}catch(e){}return;';
fs.writeFileSync(f,s.replace(old,neu));
console.log('OK');
