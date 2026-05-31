const fs = require('fs');
const path = 'src/components/dashboard/MeetingsTab.tsx';
let c = fs.readFileSync(path, 'utf8');

// Reemplazar statusMap con version sin JSX
const oldMap = `const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:   { label: 'Pendiente',  color: 'bg-amber-500/15 text-amber-300',  icon: <Clock        className='h-3 w-3' /> },
  confirmed: { label: 'Confirmada', color: 'bg-green-500/15 text-green-300',  icon: <CheckCircle2 className='h-3 w-3' /> },
  cancelled: { label: 'Cancelada',  color: 'bg-red-500/15 text-red-300',      icon: <XCircle      className='h-3 w-3' /> },
};`;

const newMap = `const statusMap: Record<string, { label: string; color: string; iconName: string }> = {
  pending:   { label: 'Pendiente',  color: 'bg-amber-500/15 text-amber-300',  iconName: 'clock' },
  confirmed: { label: 'Confirmada', color: 'bg-green-500/15 text-green-300',  iconName: 'check' },
  cancelled: { label: 'Cancelada',  color: 'bg-red-500/15 text-red-300',      iconName: 'x' },
};
function StatusIcon({ name }: { name: string }) {
  if (name === 'clock') return <Clock className='h-3 w-3' />;
  if (name === 'check') return <CheckCircle2 className='h-3 w-3' />;
  return <XCircle className='h-3 w-3' />;
}`;

c = c.replace(oldMap, newMap);

// Reemplazar usos de st.icon con <StatusIcon name={st.iconName} />
c = c.replace(/\{st\.icon\}/g, '<StatusIcon name={st.iconName} />');
c = c.replace(/\{val\.icon\}/g, '<StatusIcon name={val.iconName} />');

fs.writeFileSync(path, c, 'utf8');
console.log('Fixed:', c.includes('StatusIcon'));
console.log('DONE');