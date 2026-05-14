const fs = require('fs');
const path = 'src/app/(dashboard)/dashboard/admin/page.tsx';
let c = fs.readFileSync(path, 'utf8');
const lines = c.split('\n');

// Fix 1: agregar estado deletingAppt despues de updatingAppt
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const [updatingAppt,') && lines[i].includes('setUpdatingAppt')) {
    lines.splice(i+1, 0, '  const [deletingAppt,  setDeletingAppt]  = useState<string | null>(null);');
    console.log('Fix1 done at line', i+2);
    break;
  }
}

// Fix 2: agregar handleApptDelete despues de handleApptStatus
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('// ── Task actions') && lines[i-1].trim() === '') {
    lines.splice(i, 0,
      '  async function handleApptDelete(id: string) {',
      '    if (!confirm("¿Eliminar esta cita?")) return;',
      '    setDeletingAppt(id);',
      '    try {',
      '      const res = await fetch(`/api/appointments?id=${id}`, { method: "DELETE" });',
      '      if (res.ok) { setAppointments(prev => prev.filter(a => a.id !== id)); toast.success("Cita eliminada."); }',
      '      else toast.error("Error al eliminar.");',
      '    } catch { toast.error("Error de red."); }',
      '    finally { setDeletingAppt(null); }',
      '  }',
      ''
    );
    console.log('Fix2 done at line', i+1);
    break;
  }
}

// Fix 3: agregar columna Acciones al thead
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('<th') && lines[i].includes('Estado') && lines[i+1] && lines[i+1].includes('</tr>')) {
    lines.splice(i+1, 0, '                       <th className="px-4 py-3 text-right text-xs font-medium text-white/40 uppercase tracking-wider">Acciones</th>');
    console.log('Fix3 done at line', i+2);
    break;
  }
}

// Fix 4: agregar td con botones despues del </Select></td>
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('</Select>') && lines[i+1] && lines[i+1].trim() === '</td>' && lines[i+2] && lines[i+2].trim() === '</tr>') {
    lines.splice(i+2, 0,
      '                              <td className="px-4 py-3">',
      '                                <div className="flex items-center justify-end gap-1">',
      '                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-white/30 hover:text-red-400 hover:bg-red-400/10"',
      '                                    disabled={deletingAppt === appt.id}',
      '                                    onClick={() => handleApptDelete(appt.id)}>',
      '                                    <Trash2 className="h-3.5 w-3.5" />',
      '                                  </Button>',
      '                                </div>',
      '                              </td>'
    );
    console.log('Fix4 done at line', i+3);
    break;
  }
}

c = lines.join('\n');
fs.writeFileSync(path, c, 'utf8');
console.log('DONE');