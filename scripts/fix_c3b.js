const fs = require('fs');
const path = 'src/app/api/appointments/route.ts';
let c = fs.readFileSync(path, 'utf8');
const lines = c.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("email: { not: { endsWith: '@internal.boost' } }")) {
    lines[i] = "    const where: Record<string, unknown> = { NOT: { email: { endsWith: '@internal.boost' } } };";
    console.log('Fixed:', lines[i]);
    break;
  }
}
c = lines.join('\n');
fs.writeFileSync(path, c, 'utf8');
console.log('DONE');