const fs = require('fs');
const path = 'src/components/dashboard/CalendarContent.tsx';
let c = fs.readFileSync(path, 'utf8');
const lines = c.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const dateISO = date ?') && lines[i+1] && lines[i+1].includes('date: dateISO')) {
    // Mover dateISO antes del body (2 líneas antes)
    const dateISOLine = lines.splice(i, 1)[0];
    // Encontrar la línea del body
    for (let j = i; j < lines.length; j++) {
      if (lines[j].includes('const body: Record<string, unknown>')) {
        lines.splice(j, 0, dateISOLine);
        console.log('Moved dateISO to line', j+1);
        break;
      }
    }
    break;
  }
}
c = lines.join('\n');
fs.writeFileSync(path, c, 'utf8');
console.log('DONE');