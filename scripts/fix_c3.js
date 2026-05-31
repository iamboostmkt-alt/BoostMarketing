const fs = require('fs');
const path = 'src/app/api/appointments/route.ts';
let c = fs.readFileSync(path, 'utf8');
const lines = c.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const where: Record<string, unknown> = {};')) {
    lines[i] = "    const where: Record<string, unknown> = { email: { not: { endsWith: '@internal.boost' } } };";
    console.log('Fixed line', i+1, ':', lines[i]);
    break;
  }
}
c = lines.join('\n');
fs.writeFileSync(path, c, 'utf8');
console.log('DONE');