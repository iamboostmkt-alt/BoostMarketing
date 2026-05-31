const fs = require('fs');
const path = 'src/components/dashboard/CalendarContent.tsx';
let c = fs.readFileSync(path, 'utf8');
const lines = c.split('\n');

// Fix 1: corregir setAppointmentFormOpen -> setApptEditOpen
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('onNewAppointment={() => { setAppointmentFormOpen(true); }}')) {
    lines[i] = lines[i].replace(
      'onNewAppointment={() => { setAppointmentFormOpen(true); }}',
      'onNewAppointment={() => { setEditingAppointment(null); setApptEditOpen(true); }}'
    );
    console.log('Fix1 done at line', i+1);
    break;
  }
}

c = lines.join('\n');
fs.writeFileSync(path, c, 'utf8');
console.log('DONE');