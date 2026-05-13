const fs = require('fs');
const path = 'src/components/dashboard/CalendarContent.tsx';
let c = fs.readFileSync(path, 'utf8');
const lines = c.split('\n');

// Reescribir el bloque de botones del panel del día limpio
// Encontrar la línea del div contenedor de botones
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("border-t border-white/[0.06] px-5 py-3 flex gap-2 shrink-0")) {
    // Reemplazar desde aquí hasta </div>
    let end = i + 1;
    let depth = 1;
    while (end < lines.length && depth > 0) {
      if (lines[end].includes('<div')) depth++;
      if (lines[end].includes('</div>')) depth--;
      end++;
    }
    const newBlock = [
      '        <div className="border-t border-white/[0.06] px-5 py-3 flex gap-2 shrink-0">',
      '          <Button size="sm"',
      '            className="bg-brand hover:bg-brand-dark text-white gap-1.5 text-xs h-8"',
      '            onClick={() => { onNewTask(); onClose(); }}>',
      '            <Plus className="w-3.5 h-3.5" />',
      '            Tarea',
      '          </Button>',
      '          <Button size="sm"',
      '            className="bg-white/[0.06] hover:bg-white/[0.10] text-white gap-1.5 text-xs h-8"',
      '            onClick={() => { onNewAppointment && onNewAppointment(); onClose(); }}>',
      '            <Video className="w-3.5 h-3.5" />',
      '            Reunion',
      '          </Button>',
      '          <Button size="sm" variant="ghost"',
      '            className="text-white/30 hover:text-white hover:bg-white/[0.06] text-xs h-8 ml-auto"',
      '            onClick={onClose}>',
      '            Cerrar',
      '          </Button>',
      '        </div>',
    ];
    lines.splice(i, end - i, ...newBlock);
    console.log('Rewrote button block at line', i+1, 'to', i+newBlock.length);
    break;
  }
}

c = lines.join('\n');
fs.writeFileSync(path, c, 'utf8');
console.log('DONE');