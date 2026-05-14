const fs = require('fs');
const path = 'src/components/dashboard/ContactForm.tsx';
let c = fs.readFileSync(path, 'utf8');
const lines = c.split('\n');

// Fix 1: quitar duplicado de deleting (linea 54)
let deletingCount = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const [deleting, setDeleting]')) {
    deletingCount++;
    if (deletingCount === 2) { lines.splice(i, 1); console.log('Removed duplicate deleting at line', i+1); break; }
  }
}

// Fix 2: quitar el segundo bloque del boton (buscar segunda ocurrencia)
let btnCount = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('onClick={handleDelete}')) {
    btnCount++;
    if (btnCount === 2) {
      // quitar las 6 lineas del segundo bloque
      lines.splice(i-1, 7);
      console.log('Removed duplicate button at line', i);
      break;
    }
  }
}

// Fix 3: agregar handleDelete antes del return
let hasHandler = lines.some(l => l.includes('async function handleDelete'));
if (!hasHandler) {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === 'return (' && lines[i-1] && lines[i-1].trim() === '') {
      lines.splice(i, 0,
        '  async function handleDelete() {',
        '    if (!contact?.id) return;',
        '    if (!confirm("Eliminar este contacto?")) return;',
        '    setDeleting(true);',
        '    try {',
        '      const res = await fetch("/api/contacts?id=" + contact.id, { method: "DELETE" });',
        '      if (res.ok) { toast.success("Contacto eliminado."); onSuccess(); onOpenChange(false); }',
        '      else { const d = await res.json(); toast.error(d.error || "Error al eliminar."); }',
        '    } catch { toast.error("Error de red."); }',
        '    finally { setDeleting(false); }',
        '  }',
        ''
      );
      console.log('Added handleDelete at line', i+1);
      break;
    }
  }
} else {
  console.log('handleDelete already exists');
}

c = lines.join('\n');
fs.writeFileSync(path, c, 'utf8');
console.log('DONE');