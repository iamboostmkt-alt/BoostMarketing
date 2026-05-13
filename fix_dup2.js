const fs = require('fs');
const path = 'src/components/dashboard/CalendarContent.tsx';
let c = fs.readFileSync(path, 'utf8');
const lines = c.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('setAppointments(prev => { const apptIds')) {
    lines[i] = "            setAppointments(prev => { const prevAppts = prev.filter((a: any) => !a.email?.endsWith('@internal.boost')); return [...prevAppts, ...(meetData.meetings || [])]; });";
    console.log('Fixed at line', i+1);
    break;
  }
}
c = lines.join('\n');
fs.writeFileSync(path, c, 'utf8');
console.log('DONE');