/* fixapp.js — localStorage ka PAKKA ilaaj

   Jad: App.js WebView ko source={{ html }} deta hai — bina URL ke.
   Aise document ka koi origin nahi hota, isliye Android WebView
   localStorage chhoone nahi deta aur script beech mein mar jaati hai.

   Fix: baseUrl de do. Isse document ko asli origin mil jaata hai,
   localStorage kaam karta hai AUR data app band karne par bhi bacha
   rehta hai (memory wale shim se ye nahi hota tha).

   Chalane ka tareeqa:  cd ~/logiop-pro && node fixapp.js
   Backup: App.js.bak_baseurl */

var fs = require('fs');
var f = 'App.js';
var s = fs.readFileSync(f, 'utf8');

if (s.indexOf('baseUrl') > -1) { console.log('baseUrl pehle se hai'); process.exit(0); }

var old = 'source={{ html }}';
if (s.indexOf(old) < 0) { console.log('ANCHOR NAHI MILA — App.js mein source={{ html }} nahi mila'); process.exit(1); }

fs.writeFileSync('App.js.bak_baseurl', s);
s = s.replace(old, "source={{ html, baseUrl: 'https://localhost' }}");
fs.writeFileSync(f, s);
console.log('OK — App.js mein baseUrl lag gaya. Backup: App.js.bak_baseurl');
