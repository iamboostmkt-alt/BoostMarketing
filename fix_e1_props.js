const fs = require('fs');
const path = 'src/components/dashboard/CalendarContent.tsx';
let c = fs.readFileSync(path, 'utf8');
const lines = c.split('\n');

// Fix 1: agregar onNewAppointment a la interfaz DayModalProps
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('onNewTask:           () => void;')) {
    lines.splice(i+1, 0, '  onNewAppointment?:  () => void;');
    console.log('Added prop to interface at line', i+2);
    break;
  }
}

// Fix 2: agregar onNewAppointment al destructuring de DayModal
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('onEditTask, onNewTask, onDeleteTask, onEditAppointment, onDeleteAppointment,')) {
    lines[i] = lines[i].replace(
      'onEditTask, onNewTask, onDeleteTask, onEditAppointment, onDeleteAppointment,',
      'onEditTask, onNewTask, onDeleteTask, onEditAppointment, onDeleteAppointment, onNewAppointment,'
    );
    console.log('Fixed destructuring at line', i+1);
    break;
  }
}

// Fix 3: conectar onNewAppointment en el uso de DayModal (buscar onNewTask={() =>)
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('onNewTask={() => {') && lines[i].includes('setTaskFormOpen')) {
    lines.splice(i+1, 0,
      '          onNewAppointment={() => { setAppointmentFormOpen(true); }}'
    );
    console.log('Connected onNewAppointment at line', i+2);
    break;
  }
}

c = lines.join('\n');
fs.writeFileSync(path, c, 'utf8');
console.log('DONE');