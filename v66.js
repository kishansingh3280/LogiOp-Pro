var fs=require('fs'),f='html.js',s=fs.readFileSync(f,'utf8');
fs.writeFileSync('html.js.bak66',s);
s=s.replace('(function v64css(){','(function v64css(){return;');
s=s.replace('(function v65wd(){','(function v65wd(){return;');
var n=s.indexOf('v64css(){return;')>-1?'boot band':'BOOT NAHI MILA';
fs.writeFileSync(f,s);console.log(n);
