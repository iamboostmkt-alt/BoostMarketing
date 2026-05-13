const fs = require('fs');
const path = 'src/components/dashboard/CalendarContent.tsx';
let c = fs.readFileSync(path, 'utf8');
const lines = c.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('setAppointments(appData.appointments || [])')) {
    // Insertar fetch de meetings después de setAppointments
    lines.splice(i + 1, 0,
      '          const meetRes = await fetch(\'/api/meetings\');',
      '          if (meetRes.ok) {',
      '            const meetData = await meetRes.json();',
      '            setAppointments(prev => [...prev, ...(meetData.meetings || [])]);',
      '          }'
    );
    console.log('Fixed at line', i+1);
    break;
  }
}
c = lines.join('\n');
fs.writeFileSync(path, c, 'utf8');
console.log('DONE');