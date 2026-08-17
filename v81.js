var fs=require('fs'),f='html.js',s=fs.readFileSync(f,'utf8');
if(s.indexOf('v81ls')>-1){console.log('pehle se laga');process.exit(0)}
fs.writeFileSync('html.js.bak81',s);
var i=s.indexOf('<script');
if(i<0){console.log('SCRIPT NAHI MILA');process.exit(1)}
var j=s.indexOf('>',i)+1;
var g='/*v81ls*/(function(){var ok=false;';
g+='try{window.localStorage.setItem("__t","1");window.localStorage.removeItem("__t");ok=true}catch(e){}';
g+='if(ok)return;var m={};var api={';
g+='getItem:function(k){k=String(k);return m.hasOwnProperty(k)?m[k]:null},';
g+='setItem:function(k,v){m[String(k)]=String(v)},';
g+='removeItem:function(k){delete m[String(k)]},';
g+='clear:function(){m={}},';
g+='key:function(n){var a=Object.keys(m);return n<a.length?a[n]:null}};';
g+='try{Object.defineProperty(api,"length",{get:function(){return Object.keys(m).length}})}catch(e){}';
g+='try{Object.defineProperty(window,"localStorage",{value:api,configurable:true,writable:true})}catch(e){}';
g+='try{Object.defineProperty(window,"sessionStorage",{value:api,configurable:true,writable:true})}catch(e){}';
g+='})();';
fs.writeFileSync(f,s.slice(0,j)+g+s.slice(j));
console.log('OK');
