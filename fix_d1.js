const fs = require('fs');
const path = 'src/app/(dashboard)/dashboard/page.tsx';
let c = fs.readFileSync(path, 'utf8');
const lines = c.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("fetch('/api/appointments?upcoming=1')")) {
    // Reemplazar el bloque del useEffect de meetings
    lines.splice(i, 4,
      "    Promise.all([",
      "      fetch('/api/appointments?upcoming=1').then(r => r.ok ? r.json() : null),",
      "      fetch('/api/meetings').then(r => r.ok ? r.json() : null),",
      "    ]).then(([appts, meets]) => {",
      "      const a = appts?.appointments || [];",
      "      const m = (meets?.meetings || []).filter((x: any) => new Date(x.date) >= new Date());",
      "      setMeetings([...a, ...m].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()));",
      "    }).finally(() => setLoadingMeetings(false));"
    );
    console.log('Fixed at line', i+1);
    break;
  }
}
c = lines.join('\n');
fs.writeFileSync(path, c, 'utf8');
console.log('DONE');