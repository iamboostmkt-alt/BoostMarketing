const fs = require('fs');
const path = 'src/components/dashboard/MeetingsTab.tsx';
let c = fs.readFileSync(path, 'utf8');
const lines = c.split('\n');
const out = [];
let skip = false;
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  // Reemplazar bloque statusMap + StatusIcon
  if (l.includes('const statusMap:')) {
    skip = true;
    out.push('const statusMap: Record<string, { label: string; color: string }> = {');
    out.push("  pending:   { label: 'Pendiente',  color: 'bg-amber-500/15 text-amber-300' },");
    out.push("  confirmed: { label: 'Confirmada', color: 'bg-green-500/15 text-green-300' },");
    out.push("  cancelled: { label: 'Cancelada',  color: 'bg-red-500/15 text-red-300'    },");
    out.push('};');
    continue;
  }
  // Skip hasta cerrar el bloque StatusIcon
  if (skip) {
    if (l.trim() === '}') { skip = false; }
    continue;
  }
  // Quitar referencias a icon/iconName
  const fixed = l
    .replace(/<StatusIcon name=\{st\.iconName\} \/>/g, '')
    .replace(/<StatusIcon name=\{val\.iconName\} \/>/g, '')
    .replace(/\{st\.icon\}/g, '')
    .replace(/\{val\.icon\}/g, '');
  out.push(fixed);
}
c = out.join('\n');
fs.writeFileSync(path, c, 'utf8');
console.log('statusMap clean:', !c.includes('StatusIcon') && !c.includes('iconName'));
console.log('DONE');