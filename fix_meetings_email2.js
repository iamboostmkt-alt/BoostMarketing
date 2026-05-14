const fs = require('fs');
const path = 'src/app/api/meetings/route.ts';
let c = fs.readFileSync(path, 'utf8');
const lines = c.split('\n');

// Fix 1: agregar imports de mailer
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('import { db }')) {
    lines.splice(i+1, 0,
      'import { sendMail, templateVideollamadaConfirmada } from "@/lib/mailer";'
    );
    console.log('Added mailer import at line', i+2);
    break;
  }
}

// Fix 2: agregar notificacion en POST despues de crear la reunion
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('return NextResponse.json({ meeting }, { status: 201 });')) {
    lines.splice(i, 0,
      '  // Notificar a asignados',
      '  if (assignedUserIds?.length > 0) {',
      '    const dateStr = parsed.toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });',
      '    const team = await db.user.findMany({ where: { id: { in: assignedUserIds as string[] } }, select: { email: true, name: true } });',
      '    for (const u of team) {',
      '      if (u.email) sendMail(u.email, "Nueva reunion asignada - BoostMarketing", templateVideollamadaConfirmada(name.trim(), dateStr, (meetUrl ?? "").trim())).catch(console.error);',
      '    }',
      '  }'
    );
    console.log('Added POST notification at line', i+1);
    break;
  }
}

// Fix 3: agregar notificacion en PATCH cuando se asignan usuarios
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('return NextResponse.json({ meeting });') && i > 60) {
    lines.splice(i, 0,
      '  // Notificar a nuevos asignados',
      '  if (assignedUserIds !== undefined && (assignedUserIds as string[]).length > 0) {',
      '    const upd = await db.appointment.findUnique({ where: { id }, select: { name: true, date: true, meetUrl: true } });',
      '    if (upd) {',
      '      const dateStr = new Date(upd.date).toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });',
      '      const team = await db.user.findMany({ where: { id: { in: assignedUserIds as string[] } }, select: { email: true } });',
      '      for (const u of team) {',
      '        if (u.email) sendMail(u.email, "Reunion actualizada - BoostMarketing", templateVideollamadaConfirmada(upd.name, dateStr, upd.meetUrl || "")).catch(console.error);',
      '      }',
      '    }',
      '  }'
    );
    console.log('Added PATCH notification at line', i+1);
    break;
  }
}

c = lines.join('\n');
fs.writeFileSync(path, c, 'utf8');
console.log('DONE');