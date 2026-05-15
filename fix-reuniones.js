const fs = require('fs');
const file = 'src/components/dashboard/ClientPortalContent.tsx';
let s = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

const meetingCard = `

// ── Meeting cards ─────────────────────────────────────────────────────────────

const meetingStatusConfig = {
  pending:   { label: 'Programada',  color: 'bg-blue-500/15 text-blue-300 border-blue-500/20' },
  completed: { label: 'Realizada',   color: 'bg-green-500/15 text-green-300 border-green-500/20' },
  cancelled: { label: 'Cancelada',   color: 'bg-red-500/15 text-red-300 border-red-500/20' },
};

function MeetingCard({ appointment }) {
  const [expanded, setExpanded] = useState(false);
  const status = appointment.status || 'pending';
  const cfg = meetingStatusConfig[status] ?? meetingStatusConfig.pending;
  const isPast = new Date(appointment.date) < new Date();
  return (
    <div
      className={\`glass-card rounded-xl overflow-hidden transition-all duration-200 cursor-pointer \${expanded ? 'ring-1 ring-brand/30' : 'hover:ring-1 hover:ring-white/10'}\`}
      onClick={() => setExpanded(e => !e)}
    >
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Video className={\`h-4 w-4 shrink-0 \${isPast ? 'text-white/30' : 'text-green-400'}\`} />
            <p className="text-sm font-semibold text-white truncate">{appointment.name || 'Videollamada'}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={\`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium \${cfg.color}\`}>
              {cfg.label}
            </span>
            <ChevronDown className={\`w-3.5 h-3.5 text-white/30 transition-transform duration-200 \${expanded ? 'rotate-180' : ''}\`} />
          </div>
        </div>
        {!expanded && (
          <p className="text-[11px] text-white/35 pl-6">
            {fmtDate(appointment.date)}{appointment.time ? ' · ' + appointment.time : ''}
          </p>
        )}
      </div>
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/[0.06] pt-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/[0.03] rounded-lg p-2.5">
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium mb-0.5">Fecha</p>
              <p className="text-xs text-white/70 font-medium">{fmtDate(appointment.date)}</p>
            </div>
            {appointment.time && (
              <div className="bg-white/[0.03] rounded-lg p-2.5">
                <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium mb-0.5">Hora</p>
                <p className="text-xs text-white/70 font-medium">{appointment.time}</p>
              </div>
            )}
          </div>
          {appointment.description && (
            <p className="text-xs text-white/60 leading-relaxed">{appointment.description}</p>
          )}
          {appointment.link && (
            
              href={appointment.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-lg px-3 py-2 text-green-400 text-xs font-medium transition-colors w-fit"
            >
              <Video className="w-3.5 h-3.5" />
              Unirse a la reunión
            </a>
          )}
        </div>
      )}
    </div>
  );
}
`;

const insertAfter = '// ── Progress bar ──────────────────────────────────────────────────────────────';
if (!s.includes('MeetingCard')) {
  s = s.replace(insertAfter, meetingCard + '\n' + insertAfter);
  console.log('✅ MeetingCard inserted');
} else {
  console.log('⚠️  MeetingCard already exists');
}

const oldEnd = `            <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
              {displayedTasks.map((task) => <TaskCard key={task.id} task={task} />)}
            </div>
          )}
        </div>
      </div>`;

const newEnd = `            <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
              {displayedTasks.map((task) => <TaskCard key={task.id} task={task} />)}
            </div>
          )}

          {/* Reuniones */}
          <div className="pt-3 border-t border-white/[0.04] space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 rounded-full bg-green-500" />
              <h3 className="text-sm font-semibold text-white">Reuniones</h3>
              {appointments.length > 0 && (
                <span className="text-[10px] bg-green-500/15 text-green-300 border border-green-500/20 rounded-full px-2 py-0.5">{appointments.length}</span>
              )}
            </div>
            {appointments.length === 0 ? (
              <div className="py-8 flex flex-col items-center gap-2 text-center">
                <Video className="w-7 h-7 text-white/15" />
                <p className="text-white/35 text-sm">No hay reuniones programadas.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
                {appointments.map((appt) => <MeetingCard key={appt.id} appointment={appt} />)}
              </div>
            )}
          </div>
        </div>
      </div>`;

if (s.includes(oldEnd)) {
  s = s.replace(oldEnd, newEnd);
  console.log('✅ Meetings section added');
} else {
  console.log('❌ Tasks column end not found — debug:');
  const idx = s.indexOf('displayedTasks.map');
  console.log(JSON.stringify(s.substring(idx, idx+250)));
}

const oldPlaceholder = `      {/* Reuniones */}\n      <div className="glass-card rounded-2xl p-5">\n        <p className="text-white/40 text-sm text-center py-8">Próximamente — vista de reuniones</p>\n      </div>\n\n      <DayModal`;
if (s.includes(oldPlaceholder)) {
  s = s.replace(oldPlaceholder, '      <DayModal');
  console.log('✅ Old placeholder removed');
} else {
  console.log('⚠️  Old placeholder not found');
}

s = s.replace(/\n/g, '\r\n');
fs.writeFileSync(file, s);
console.log('✅ Done');
