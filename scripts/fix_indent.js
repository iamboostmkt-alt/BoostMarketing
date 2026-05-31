const fs = require('fs');
const path = 'src/components/dashboard/CalendarContent.tsx';
let c = fs.readFileSync(path, 'utf8');
const lines = c.split('\n');

// Fix indentacion de onNewAppointment
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('onNewAppointment={() => { setEditingAppointment(null); setApptEditOpen(true); }}')) {
    lines[i] = '        onNewAppointment={() => { setEditingAppointment(null); setApptEditOpen(true); }}';
    console.log('Fixed indentation at line', i+1);
    break;
  }
}

// Pre-llenar fecha con selectedDay al abrir form de appointment nuevo
// El form de appointment usa useEffect con [open, appointment]
// Necesitamos pasar initialDate al AppointmentEditForm
// Por ahora al abrir desde DayModal, setear una fecha inicial via el editingAppointment con solo date
// Buscar donde se inicializa el date en el form
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("setDate(appointment.date") || lines[i].includes("new Date(appointment.date)")) {
    console.log('Date init found at line', i+1, lines[i]);
    break;
  }
}

c = lines.join('\n');
fs.writeFileSync(path, c, 'utf8');
console.log('DONE');