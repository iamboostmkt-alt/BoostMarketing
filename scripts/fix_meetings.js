const fs = require('fs');
const path = 'src/app/(dashboard)/dashboard/admin/page.tsx';
let c = fs.readFileSync(path, 'utf8');

console.log('meetings trigger:', c.includes('value="meetings"'));
console.log('meetings content:', c.includes('TabsContent value="meetings"'));
console.log('Video import:', c.includes('Video'));
console.log('MeetingsTab import:', c.includes('MeetingsTab'));

// Fix trigger si falta
if (!c.includes('value="meetings"')) {
  const old = '          <TabsTrigger value="tasks" className="data-[state=active]:bg-brand data-[state=active]:text-white text-white/50 gap-2">';
  const neu = '              <TabsTrigger value="meetings" className="data-[state=active]:bg-brand data-[state=active]:text-white text-white/50 gap-2">\n                <Video className="h-4 w-4" />Reuniones\n              </TabsTrigger>\n' + old;
  c = c.replace(old, neu);
  console.log('trigger fixed:', c.includes('value="meetings"'));
}

// Fix TabsContent si falta
if (!c.includes('TabsContent value="meetings"')) {
  const lines = c.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Tasks tab') && lines[i].includes('sustituye')) {
      const orig = lines[i].replace(/\r$/, '');
      const block = '        {/* Reuniones tab */}\n        {isAdmin && (\n          <TabsContent value="meetings" className="mt-4">\n            <MeetingsTab />\n          </TabsContent>\n        )}\n\n' + orig;
      c = c.replace(orig, block);
      console.log('content fixed:', c.includes('TabsContent value="meetings"'));
      break;
    }
  }
}

// Fix Video import si falta
if (!c.includes('Video')) {
  c = c.replace('  Shield,', '  Shield,\n  Video,');
  console.log('Video import fixed');
}

fs.writeFileSync(path, c, 'utf8');
console.log('DONE');