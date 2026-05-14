const fs = require('fs');
const path = 'src/app/api/meetings/route.ts';
let c = fs.readFileSync(path, 'utf8');
const lines = c.split('\n');

// Fix 1: recibir status del body
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const { name, date, notes, meetUrl, assignedUserIds } = await req.json();')) {
    lines[i] = lines[i].replace(
      'const { name, date, notes, meetUrl, assignedUserIds } = await req.json();',
      'const { name, date, notes, meetUrl, assignedUserIds, status } = await req.json();'
    );
    console.log('Fix1 done at line', i+1);
    break;
  }
}

// Fix 2: usar status del body con fallback a pending
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('status: "pending",')) {
    lines[i] = lines[i].replace('status: "pending",', 'status: (status as string) || "pending",');
    console.log('Fix2 done at line', i+1);
    break;
  }
}

c = lines.join('\n');
fs.writeFileSync(path, c, 'utf8');
console.log('DONE');