const fs = require('fs');
const path = 'src/components/dashboard/CalendarContent.tsx';
let c = fs.readFileSync(path, 'utf8');
const lines = c.split('\n');

// Fix 1: agregar initialDate a la interfaz AppointmentEditModalProps
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('onDeleted?:   (id: string) => void;')) {
    lines.splice(i+1, 0, '  initialDate?: Date | null;');
    console.log('Added to interface at line', i+2);
    break;
  }
}

// Fix 2: agregar initialDate al destructuring
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('function AppointmentEditModal({ open, onOpenChange, appointment, onSaved, onDeleted }')) {
    lines[i] = lines[i].replace(
      'function AppointmentEditModal({ open, onOpenChange, appointment, onSaved, onDeleted }',
      'function AppointmentEditModal({ open, onOpenChange, appointment, onSaved, onDeleted, initialDate }'
    );
    console.log('Fixed destructuring at line', i+1);
    break;
  }
}

c = lines.join('\n');
fs.writeFileSync(path, c, 'utf8');
console.log('DONE');