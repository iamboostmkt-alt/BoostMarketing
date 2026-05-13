const fs = require('fs');
const path = 'src/components/dashboard/CalendarContent.tsx';
let c = fs.readFileSync(path, 'utf8');
const lines = c.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("const method = appointment ? 'PATCH' : 'POST'")) {
    lines.splice(i, 0, "      const dateISO = date ? new Date(date).toISOString() : date;");
    console.log('Inserted at line', i+1);
    break;
  }
}
c = lines.join('\n');
fs.writeFileSync(path, c, 'utf8');
console.log('DONE');