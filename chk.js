var s=require('fs').readFileSync('html.js','utf8');
var i=s.indexOf('`'),j=s.lastIndexOf('`');
var h=s.slice(i+1,j);
var re=/<script[^>]*>([\s\S]*?)<\/script>/g,m,n=0;
while((m=re.exec(h))){n++;try{new Function(m[1]);console.log('script '+n+' OK')}catch(e){console.log('script '+n+' ERROR: '+e.message)}}
console.log('kul script:',n);
