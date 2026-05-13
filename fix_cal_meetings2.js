const fs = require('fs');
const path = 'src/components/dashboard/CalendarContent.tsx';
let c = fs.readFileSync(path, 'utf8');
const lines = c.split('\n');
// Encontrar el bloque y reescribirlo limpio
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("const appRes = await fetch('/api/appointments')")) {
    // Reemplazar líneas 517-527 (índices i a i+9)
    const indent = '          ';
    const newBlock = [
      indent + "const appRes = await fetch('/api/appointments');",
      indent + 'if (appRes.ok) {',
      indent + '  const appData = await appRes.json();',
      indent + '  setAppointments(appData.appointments || []);',
      indent + '}',
      indent + "const meetRes = await fetch('/api/meetings');",
      indent + 'if (meetRes.ok) {',
      indent + '  const meetData = await meetRes.json();',
      indent + '  setAppointments(prev => [...prev, ...(meetData.meetings || [])]);',
      indent + '}',
    ];
    // Encontrar cuántas líneas reemplazar
    let end = i;
    while (end < lines.length && !lines[end].includes('}\n') && end < i + 12) end++;
    lines.splice(i, 10, ...newBlock);
    console.log('Fixed block at line', i+1);
    break;
  }
}
c = lines.join('\n');
fs.writeFileSync(path, c, 'utf8');
console.log('DONE');