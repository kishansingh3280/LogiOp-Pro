var fs=require('fs'),f='html.js',s=fs.readFileSync(f,'utf8');
fs.writeFileSync('html.js.bak67',s);
s=s.replace('(function v64css(){return;','(function v64css(){');
s=s.replace('(function v65wd(){return;setTimeout','(function v65wd(){setTimeout');
var b='\n/* --- v67 splash kill --- */\n(function(){function k(){try{var b=document.getElementById("bootMsg");var o=b&&b.closest?b.closest("div[class*=boot],#boot,.splash,.bootwrap"):null;if(o&&o!==document.body)o.remove();else if(b)b.remove();var l=document.querySelectorAll("[id*=boot],[class*=boot],[class*=splash]");for(var i=0;i<l.length;i++){var e=l[i];var c=getComputedStyle(e);if(c.position==="fixed"&&e.offsetHeight>300)e.remove()}document.body.style.overflow="";}catch(e){}}setTimeout(k,3500)})();\n';
var i=s.lastIndexOf('<\/script>');
fs.writeFileSync(f,s.slice(0,i)+b+s.slice(i));
console.log('OK');
