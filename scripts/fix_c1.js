const fs = require('fs');
const path = 'src/components/dashboard/ContactForm.tsx';
let c = fs.readFileSync(path, 'utf8');
const lines = c.split('\n');

// Fix 1: agregar Trash2 al import de lucide
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("import { Loader2 } from 'lucide-react';")) {
    lines[i] = "import { Loader2, Trash2 } from 'lucide-react';";
    console.log('Fix1 done at line', i+1);
    break;
  }
}

// Fix 2: agregar estado deleting
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const [loading, setLoading] = useState(false);')) {
    lines.splice(i+1, 0, '  const [deleting, setDeleting] = useState(false);');
    console.log('Fix2 done at line', i+2);
    break;
  }
}

// Fix 3: agregar handleDelete antes del return
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('  return (') && lines[i-1] && lines[i-1].trim() === '') {
    lines.splice(i, 0,
      '  async function handleDelete() {',
      '    if (!contact?.id) return;',
      '    if (!confirm("¿Eliminar este contacto? Esta acción no se puede deshacer.")) return;',
      '    setDeleting(true);',
      '    try {',
      '      const res = await fetch(`/api/contacts?id=${contact.id}`, { method: "DELETE" });',
      '      if (res.ok) { toast.success("Contacto eliminado."); onSuccess(); onOpenChange(false); }',
      '      else { const d = await res.json(); toast.error(d.error || "Error al eliminar."); }',
      '    } catch { toast.error("Error de red."); }',
      '    finally { setDeleting(false); }',
      '  }',
      ''
    );
    console.log('Fix3 done at line', i+1);
    break;
  }
}

// Fix 4: agregar boton eliminar en DialogFooter (antes del Cancelar)
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('<DialogFooter className="pt-2">')) {
    lines.splice(i+1, 0,
      '            {isEditing && (',
      '              <Button type="button" variant="ghost" onClick={handleDelete} disabled={deleting || loading}',
      '                className="text-red-400 hover:text-red-300 hover:bg-red-400/10 mr-auto gap-1.5">',
      '                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}',
      '                Eliminar',
      '              </Button>',
      '            )}'
    );
    console.log('Fix4 done at line', i+2);
    break;
  }
}

c = lines.join('\n');
fs.writeFileSync(path, c, 'utf8');
console.log('DONE');