/* v77 — airline/bank logo ka asli size fix (source par)

   Jad: logoURI() SVG ko data-URI bana kar <img> mein daalta hai, par us SVG
   mein width/height hai hi nahi — sirf viewBox. Aisi surat mein browser use
   apne default par bahut bada khol deta hai, isliye map par logo poore area
   jitna ho gaya tha. CSS se rokna kaam nahi aaya kyunki intrinsic size yahin
   tay hota hai.

   Fix: encode karne se pehle <svg> tag mein width/height daal do. Ek jagah
   badla, sab jagah asar — map, legend chips, trips, bank chips.

   Chalane ka tareeqa:  cd ~/logiop-pro && node v77.js
   Backup: html.js.bak77 */

var fs = require('fs');
var f = 'html.js';
var s = fs.readFileSync(f, 'utf8');

if (s.indexOf('v77size') > -1) { console.log('v77 pehle se laga hai'); process.exit(0); }

var old = "function logoURI(code){const s=LOGOS[code]||LOGOS['IATA'];return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(s)}";

if (s.indexOf(old) < 0) { console.log('ANCHOR NAHI MILA — logoURI ka code badal gaya hai'); process.exit(1); }

fs.writeFileSync('html.js.bak77', s);

/* v77size sirf nishaan ke liye hai taaki dobara na lage */
var neu = "function logoURI(code){/*v77size*/var s=LOGOS[code]||LOGOS['IATA'];s=String(s).replace(/<svg\\b/i,'<svg width=\"64\" height=\"18\" preserveAspectRatio=\"xMidYMid meet\"');return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(s)}";

s = s.replace(old, neu);
fs.writeFileSync(f, s);
console.log('OK — v77 laga. Backup: html.js.bak77');
