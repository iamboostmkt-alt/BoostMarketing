const fs = require('fs');
const path = 'src/app/api/tasks/route.ts';
let c = fs.readFileSync(path, 'utf8');
const lines = c.split('\n');

// Agregar email de felicitacion despues del email de cambio de estado
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('templateCambioEstado(task.title, existing.status') && lines[i+1] && lines[i+1].includes(');')) {
    lines.splice(i+2, 0,
      '    // Email felicitacion al completar',
      '    if (task.status === "completed") {',
      '      for (const email of emails) {',
      '        sendMail(email, "Tarea completada - BoostMarketing", templateTareaCompletada(task.title, userName)).catch(console.error);',
      '      }',
      '    }'
    );
    console.log('Added completion email at line', i+3);
    break;
  }
}

// Verificar que templateTareaCompletada esta importado
if (!c.includes('templateTareaCompletada')) {
  c = lines.join('\n');
  c = c.replace(
    'templateCambioEstado,',
    'templateCambioEstado,\n  templateTareaCompletada,'
  );
  fs.writeFileSync(path, c, 'utf8');
} else {
  c = lines.join('\n');
  fs.writeFileSync(path, c, 'utf8');
}
console.log('DONE');