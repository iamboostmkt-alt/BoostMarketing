const fs = require('fs');
const path = 'src/components/dashboard/MeetingsTab.tsx';
let c = fs.readFileSync(path, 'utf8');

// Fix statusMap - reemplazar con split/join para evitar problemas de line endings
const lines = c.split('\n');
const newLines = [];
let skip = false;
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  if (l.includes('const statusMap:')) {
    skip = true;
    newLines.push('const statusMap: Record<string, { label: string; color: string; iconName: string }> = {');
    newLines.push("  pending:   { label: 'Pendiente',  color: 'bg-amber-500/15 text-amber-300',  iconName: 'clock' },");
    newLines.push("  confirmed: { label: 'Confirmada', color: 'bg-green-500/15 text-green-300',  iconName: 'check' },");
    newLines.push("  cancelled: { label: 'Cancelada',  color: 'bg-red-500/15 text-red-300',      iconName: 'x' },");
    newLines.push('};');
    newLines.push('function StatusIcon({ name }: { name: string }) {');
    newLines.push("  if (name === 'clock') return <Clock className='h-3 w-3' />;");
    newLines.push("  if (name === 'check') return <CheckCircle2 className='h-3 w-3' />;");
    newLines.push("  return <XCircle className='h-3 w-3' />;");
    newLines.push('}');
    continue;
  }
  if (skip && l.trim() === '};') { skip = false; continue; }
  if (skip) continue;
  // Fix icon usage
  newLines.push(l.replace(/{st\.icon}/g, '<StatusIcon name={st.iconName} />').replace(/{val\.icon}/g, '<StatusIcon name={val.iconName} />'));
}
c = newLines.join('\n');
fs.writeFileSync(path, c, 'utf8');
console.log('statusMap fixed, StatusIcon present:', c.includes('StatusIcon'));
console.log('No JSX in statusMap:', !c.includes('icon: <Clock'));
console.log('DONE');