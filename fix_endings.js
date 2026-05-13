const fs = require('fs');
const path = 'src/components/dashboard/MeetingsTab.tsx';
let c = fs.readFileSync(path, 'utf8');
// Normalizar todos los line endings a \n
c = c.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
fs.writeFileSync(path, c, 'utf8');
console.log('Normalized. Has CRLF:', c.includes('\r\n'));
console.log('DONE');