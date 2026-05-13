const fs = require('fs');
const path = 'src/components/dashboard/CalendarContent.tsx';
let c = fs.readFileSync(path, 'utf8');
const lines = c.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('name, email, phone, date, notes, status, meetUrl, assignedUserIds')) {
    // Insertar conversión de fecha antes del body
    lines.splice(i, 0,
      '      const dateISO = date ? new Date(date).toISOString() : date;'
    );
    // Reemplazar date por dateISO en el body
    lines[i+1] = lines[i+1].replace('name, email, phone, date,', 'name, email, phone, date: dateISO,');
    console.log('Fixed at line', i+1);
    console.log(lines.slice(i, i+3).join('\n'));
    break;
  }
}
c = lines.join('\n');
fs.writeFileSync(path, c, 'utf8');
console.log('DONE');