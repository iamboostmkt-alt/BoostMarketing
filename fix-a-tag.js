const fs = require('fs');
const file = 'src/components/dashboard/ClientPortalContent.tsx';
let s = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

// Fix the broken <a tag - find the pattern and replace
const broken = `          {appointment.link && (
            
              href={appointment.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-lg px-3 py-2 text-green-400 text-xs font-medium transition-colors w-fit"
            >
              <Video className="w-3.5 h-3.5" />
              Unirse a la reunión
            </a>
          )}`;

const fixed = `          {appointment.link && (
            
              href={appointment.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-lg px-3 py-2 text-green-400 text-xs font-medium transition-colors w-fit"
            >
              <Video className="w-3.5 h-3.5" />
              Unirse a la reunión
            </a>
          )}`;

if (s.includes(broken)) {
  s = s.replace(broken, fixed);
  console.log('✅ <a tag fixed');
} else {
  console.log('❌ Pattern not found — debug:');
  const idx = s.indexOf('appointment.link && (');
  console.log(JSON.stringify(s.substring(idx, idx+300)));
}

s = s.replace(/\n/g, '\r\n');
fs.writeFileSync(file, s);
console.log('✅ Done');
