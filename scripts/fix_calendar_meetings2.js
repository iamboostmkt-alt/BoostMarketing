const fs = require('fs');
const path = 'src/components/dashboard/CalendarContent.tsx';
let c = fs.readFileSync(path, 'utf8');
const lines = c.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("const res = await fetch('/api/appointments'") && lines[i+1] && lines[i+1].includes('method,')) {
    lines.splice(i, 0, "      const apiUrl = appointment ? '/api/appointments' : '/api/meetings';");
    lines[i+1] = lines[i+1].replace("fetch('/api/appointments'", 'fetch(apiUrl');
    console.log('Fixed at line', i+1);
    console.log(lines.slice(i, i+3).join('\n'));
    break;
  }
}
c = lines.join('\n');
fs.writeFileSync(path, c, 'utf8');
console.log('DONE');