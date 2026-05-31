const fs = require('fs');
const path = 'src/components/dashboard/CalendarContent.tsx';
let c = fs.readFileSync(path, 'utf8');
const lines = c.split('\n');

// Encontrar setAppointments con prev => [...prev, ...]
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('setAppointments(prev => [...prev, ...(meetData.meetings || [])]);')) {
    lines[i] = lines[i].replace(
      'setAppointments(prev => [...prev, ...(meetData.meetings || [])]);',
      'setAppointments(prev => { const apptIds = new Set((appData?.appointments || []).map((a: any) => a.id)); const prevAppts = prev.filter(a => !(a as any).email?.endsWith(\'@internal.boost\')); return [...prevAppts, ...(meetData.meetings || [])]; });'
    );
    console.log('Fixed duplicate at line', i+1);
    break;
  }
}

c = lines.join('\n');
fs.writeFileSync(path, c, 'utf8');
console.log('DONE');