const fs = require('fs');
const path = 'src/components/dashboard/ContactForm.tsx';
let c = fs.readFileSync(path, 'utf8');
const lines = c.split('\n');

// Insertar handleDelete en linea 118 (indice 117, antes del return)
lines.splice(118, 0,
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
console.log('handleDelete inserted');

c = lines.join('\n');
fs.writeFileSync(path, c, 'utf8');
console.log('DONE');