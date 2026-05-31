const fs = require('fs');
const path = 'src/components/dashboard/CalendarContent.tsx';
let c = fs.readFileSync(path, 'utf8');
c = c.replace(
  "      const res = await fetch('/api/appointments', {\n        method,\n        headers: { 'Content-Type': 'application/json' },\n        body: JSON.stringify(body),\n      });",
  "      const apiUrl = appointment ? '/api/appointments' : '/api/meetings';\n      const res = await fetch(apiUrl, {\n        method,\n        headers: { 'Content-Type': 'application/json' },\n        body: JSON.stringify(body),\n      });"
);
fs.writeFileSync(path, c, 'utf8');
console.log('Done:', c.includes('/api/meetings'));