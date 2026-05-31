const fs = require('fs');
const path = 'src/components/dashboard/CalendarContent.tsx';
let c = fs.readFileSync(path, 'utf8');
const lines = c.split('\n');
// Línea 206 es índice 205
if (lines[205].trim().replace('\r','') === '</div>') {
  lines.splice(205, 1);
  console.log('Removed line 206');
} else {
  console.log('Not found:', JSON.stringify(lines[205]));
}
c = lines.join('\n');
fs.writeFileSync(path, c, 'utf8');
console.log('DONE');