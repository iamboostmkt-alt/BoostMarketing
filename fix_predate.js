const fs = require('fs');
const path = 'src/components/dashboard/CalendarContent.tsx';
let c = fs.readFileSync(path, 'utf8');
const lines = c.split('\n');

// Fix 1: al abrir nuevo appointment desde DayModal, pre-set la fecha con selectedDay
// Cambiar onNewAppointment para guardar el selectedDay como initialDate
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('onNewAppointment={() => { setEditingAppointment(null); setApptEditOpen(true); }}')) {
    lines[i] = lines[i].replace(
      'onNewAppointment={() => { setEditingAppointment(null); setApptEditOpen(true); }}',
      'onNewAppointment={() => { setEditingAppointment(null); setApptInitialDate(selectedDay); setApptEditOpen(true); }}'
    );
    console.log('Fix1 done at line', i+1);
    break;
  }
}

// Fix 2: agregar estado apptInitialDate cerca de editingAppointment
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const [editingAppointment, setEditingAppointment]')) {
    lines.splice(i+1, 0, '  const [apptInitialDate, setApptInitialDate] = useState<Date | null>(null);');
    console.log('Fix2 done at line', i+2);
    break;
  }
}

// Fix 3: en el else del useEffect del form (linea 133-135), usar apptInitialDate
// Buscar "else if (open && !appointment)"
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("} else if (open && !appointment) {")) {
    // La siguiente linea tiene setDate(''). Necesitamos agregar logica de initialDate
    // Pero el form no tiene acceso a apptInitialDate directamente...
    // Mejor approach: pasar initialDate como prop al AppointmentEditForm
    console.log('Found else at line', i+1);
    break;
  }
}

c = lines.join('\n');
fs.writeFileSync(path, c, 'utf8');
console.log('DONE');