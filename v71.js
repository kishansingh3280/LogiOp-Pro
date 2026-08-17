var fs=require('fs'),f='html.js',s=fs.readFileSync(f,'utf8');
fs.writeFileSync('html.js.bak71',s);
var css='.wmap img{max-width:26px!important;max-height:14px!important;width:auto!important;height:13px!important;object-fit:contain!important}.wmap svg.ac,.wpl svg.ac{width:34px!important;height:34px!important}.wmap .wpl{max-width:60px!important}';
var b='\n(function(){try{var t=document.createElement("style");t.id="v71map";t.textContent='+JSON.stringify(css)+';document.head.appendChild(t)}catch(e){}})();\n';
var i=s.lastIndexOf('<\/script>');
fs.writeFileSync(f,s.slice(0,i)+b+s.slice(i));console.log('OK');
