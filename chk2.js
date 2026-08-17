var fs=require('fs'),s=fs.readFileSync('html.js','utf8');
var i=s.indexOf('`'),j=s.lastIndexOf('`');
var h=s.slice(i+1,j).replace(/\\`/g,'`').replace(/\\\$/g,'$');
var a=h.indexOf('<script'),b=h.lastIndexOf('</script>');
fs.writeFileSync('tmp_chk.js',h.slice(h.indexOf('>',a)+1,b));
