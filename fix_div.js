const fs = require('fs');
const path = 'src/components/dashboard/CalendarContent.tsx';
let c = fs.readFileSync(path, 'utf8');
const lines = c.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === '</div>' && lines[i-1] && lines[i-1].trim() === '</div>' && lines[i+1] && lines[i+1].includes('space-y-1.5') && lines[i+1].includes('Telefono')) {
    lines.splice(i, 1);
    console.log('Removed extra </div> at line', i+1);
    break;
  }
}
c = lines.join('\n');
fs.writeFileSync(path, c, 'utf8');
console.log('DONE');