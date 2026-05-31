const fs = require('fs');
const path = 'src/components/dashboard/CalendarContent.tsx';
let c = fs.readFileSync(path, 'utf8');
const lines = c.split('\n');

// Fix 1: placeholder "Nombre del prospecto" → "Titulo de la reunion"
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('placeholder="Nombre del prospecto"')) {
    lines[i] = lines[i].replace('placeholder="Nombre del prospecto"', 'placeholder="Titulo de la reunion"');
    console.log('Fix1 done line', i+1);
    break;
  }
}

// Fix 2: quitar campo Email (Label + Input email, 4 lineas)
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("text-xs\">Email *</Label>")) {
    lines.splice(i-1, 5); // quitar div.space-y-1.5, Label, Input, y cierre div
    console.log('Fix2 done: removed email field at line', i);
    break;
  }
}

// Fix 3: agregar boton "Reunion" junto a "Tarea" en panel del dia
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('onClick={() => { onNewTask(); onClose(); }}')) {
    lines.splice(i+3, 0,
      '          <Button size="sm"',
      '            className="bg-white/[0.06] hover:bg-white/[0.10] text-white gap-1.5 text-xs h-8"',
      '            onClick={() => { onNewAppointment && onNewAppointment(); onClose(); }}>',
      '            <Video className="w-3.5 h-3.5" />',
      '            Reunion',
      '          </Button>'
    );
    console.log('Fix3 done: added Reunion button at line', i+4);
    break;
  }
}

c = lines.join('\n');
fs.writeFileSync(path, c, 'utf8');
console.log('DONE');