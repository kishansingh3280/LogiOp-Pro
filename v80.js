var fs=require('fs'),f='html.js',s=fs.readFileSync(f,'utf8');
if(s.indexOf('v80err')>-1){console.log('pehle se');process.exit(0)}
fs.writeFileSync('html.js.bak80',s);
var i=s.indexOf('<script');
if(i<0){console.log('SCRIPT NAHI MILA');process.exit(1)}
var j=s.indexOf('>',i)+1;
var g='/*v80err*/window.onerror=function(m,src,l,c){try{var d=document.createElement("div");d.style.cssText="position:fixed;z-index:99999;left:0;right:0;bottom:0;background:#b00020;color:#fff;font:12px monospace;padding:10px;white-space:pre-wrap";d.textContent="ERR: "+m+"  @line "+l+":"+c;if(document.body)document.body.appendChild(d);else setTimeout(function(){document.body&&document.body.appendChild(d)},800)}catch(e){}};';
fs.writeFileSync(f,s.slice(0,j)+g+s.slice(j));
console.log('OK');
