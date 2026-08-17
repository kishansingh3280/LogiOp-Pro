import fs from 'fs';
import h from './html_chk.mjs';
const a=h.indexOf('<script'),b=h.lastIndexOf('</script>');
fs.writeFileSync('tmp_chk.js',h.slice(h.indexOf('>',a)+1,b));
