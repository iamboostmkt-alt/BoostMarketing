const fs = require('fs');
const path = 'src/components/dashboard/MeetingsTab.tsx';
let c = fs.readFileSync(path, 'utf8');
const lines = c.split('\n');
lines[115] = "                      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors ${sel ? 'border-brand bg-brand/20 text-brand-light' : 'border-white/[0.08] bg-white/[0.03] text-white/50 hover:text-white'}`}>";
c = lines.join('\n');
fs.writeFileSync(path, c, 'utf8');
console.log('Line 116 fixed:', lines[115].includes('border-brand'));
console.log('DONE');