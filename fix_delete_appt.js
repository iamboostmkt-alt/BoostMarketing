const fs = require('fs');
const path = 'src/components/dashboard/CalendarContent.tsx';
let c = fs.readFileSync(path, 'utf8');
const lines = c.split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const handleDeleteAppointment = async (id: string) => {')) {
    // Reemplazar el handler completo
    lines.splice(i, 13,
      '  const handleDeleteAppointment = async (id: string) => {',
      '    try {',
      '      const appt = appointments.find(a => a.id === id);',
      '      const isMeeting = appt && (appt as any).email?.endsWith(\'@internal.boost\');',
      '      const apiUrl = isMeeting ? `/api/meetings?id=${id}` : `/api/appointments?id=${id}`;',
      '      const res = await fetch(apiUrl, { method: \'DELETE\' });',
      '      if (res.ok) {',
      '        setAppointments((prev) => prev.filter((a) => a.id !== id));',
      '        toast.success(isMeeting ? \'Reunion eliminada\' : \'Videollamada eliminada\');',
      '      } else {',
      '        toast.error(\'Error al eliminar\');',
      '      }',
      '    } catch {',
      '      toast.error(\'Error de red\');',
      '    }',
      '  };'
    );
    console.log('Fixed handleDeleteAppointment at line', i+1);
    break;
  }
}

c = lines.join('\n');
fs.writeFileSync(path, c, 'utf8');
console.log('DONE');