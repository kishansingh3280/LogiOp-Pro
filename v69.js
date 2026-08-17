var fs=require('fs'),f='html.js',s=fs.readFileSync(f,'utf8');
fs.writeFileSync('html.js.bak69',s);
var b='\n/* --- v69: boot poora band --- */\n(function(){function go(){try{var b=document.getElementById("boot");if(b){b.style.display="none";b.remove()}var a=document.getElementById("authWrap");if(a)a.remove();document.body.style.overflow="";try{renderAll()}catch(e){}try{countUp()}catch(e){}}catch(e){}}if(document.readyState!=="loading")setTimeout(go,300);else document.addEventListener("DOMContentLoaded",function(){setTimeout(go,300)});setTimeout(go,1200);setTimeout(go,2500)})();\n';
var i=s.lastIndexOf('<\/script>');
fs.writeFileSync(f,s.slice(0,i)+b+s.slice(i));
console.log('OK');
