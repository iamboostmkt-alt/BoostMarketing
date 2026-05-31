const fs = require('fs');
const path = 'src/components/dashboard/CalendarContent.tsx';
let c = fs.readFileSync(path, 'utf8');
const lines = c.split('\n');

// Fix 1: pasar initialDate al AppointmentEditModal
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('appointment={editingAppointment}') && lines[i+1] && lines[i+1].includes('onSaved={fetchData}')) {
    lines.splice(i+1, 0, '        initialDate={apptInitialDate}');
    console.log('Added initialDate prop at line', i+2);
    break;
  }
}

// Fix 2: en el useEffect del AppointmentEditForm, usar initialDate cuando no hay appointment
// Buscar la interfaz del form para agregar initialDate
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('appointment?:') && lines[i].includes('Appointment')) {
    lines.splice(i+1, 0, '  initialDate?: Date | null;');
    console.log('Added initialDate to interface at line', i+2);
    break;
  }
}

// Fix 3: en el destructuring del form, agregar initialDate
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('}: {') && lines[i+1] && lines[i+1].includes('open: boolean')) {
    // buscar donde se desestructura appointment
    for (let j = i; j < Math.min(i+15, lines.length); j++) {
      if (lines[j].includes('appointment,') && lines[j].includes('onSaved')) {
        lines[j] = lines[j].replace('appointment,', 'appointment, initialDate,');
        console.log('Fixed destructuring at line', j+1);
        break;
      }
    }
    break;
  }
}

// Fix 4: usar initialDate en el else del useEffect
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("} else if (open && !appointment) {")) {
    if (lines[i+1] && lines[i+1].includes("setName(''); setEmail(''); setPhone(''); setDate('');")) {
      lines[i+1] = lines[i+1].replace(
        "setName(''); setEmail(''); setPhone(''); setDate('');",
        "setName(''); setEmail(''); setPhone('');\n      if (initialDate) { const pad = (n: number) => String(n).padStart(2,'0'); const d = initialDate; setDate(d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T10:00'); } else { setDate(''); }"
      );
      console.log('Fixed initialDate usage at line', i+2);
    }
    break;
  }
}

c = lines.join('\n');
fs.writeFileSync(path, c, 'utf8');
console.log('DONE');