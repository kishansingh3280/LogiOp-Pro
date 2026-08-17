/* rollback — html.js ko v60 wali saaf haalat par le jao
   Chalane ka tareeqa:  cd ~/logiop-pro && node rollback60.js

   Abhi wali file html.js.before_rollback mein safe rahegi,
   taaki zaroorat pade to wapas laayi ja sake. */

var fs = require('fs');

var src = 'html.js.v60.bak';
if (!fs.existsSync(src)) { console.log('ERROR: ' + src + ' nahi mila'); process.exit(1); }

fs.writeFileSync('html.js.before_rollback', fs.readFileSync('html.js'));
fs.writeFileSync('html.js', fs.readFileSync(src));

console.log('OK — html.js ab v60 wali haalat mein hai');
console.log('purani file: html.js.before_rollback');
