export type Person = {
  id: string
  name: string
  initials: string
  color: string
  status?: 'online' | 'away' | 'offline'
}

export const people: Record<string, Person> = {
  sofia: { id: 'sofia', name: 'Sofía Gómez', initials: 'SG', color: '#8b5cf6', status: 'online' },
  marcos: { id: 'marcos', name: 'Marcos Rivera', initials: 'MR', color: '#22d3ee', status: 'online' },
  alex: { id: 'alex', name: 'Alex Turner', initials: 'AT', color: '#10b981', status: 'away' },
  diseno: { id: 'diseno', name: 'Diseño Team', initials: 'DT', color: '#f59e0b', status: 'online' },
  jordan: { id: 'jordan', name: 'Jordan Lee', initials: 'JL', color: '#ef4444', status: 'offline' },
  emily: { id: 'emily', name: 'Emily Carter', initials: 'EC', color: '#ec4899', status: 'offline' },
}

export type ChannelItem = {
  id: string
  name: string
  unread?: number
  active?: boolean
}

export const internalChannels: ChannelItem[] = [
  { id: 'general', name: 'general', unread: 12 },
  { id: 'marketing', name: 'marketing', unread: 4, active: true },
  { id: 'diseno', name: 'diseño', unread: 2 },
  { id: 'paid-media', name: 'paid-media' },
  { id: 'contenido', name: 'contenido' },
  { id: 'recursos', name: 'recursos' },
]

export const clientChannels: { id: string; name: string; initials: string; color: string; unread?: number }[] = [
  { id: 'gymnastwin', name: 'GymnasTwin', initials: 'GT', color: '#8b5cf6', unread: 3 },
  { id: 'cafe', name: 'Café del Mar', initials: 'CM', color: '#22d3ee' },
  { id: 'fitlab', name: 'FitLab', initials: 'FL', color: '#10b981' },
  { id: 'peak', name: 'Peak Performance', initials: 'PP', color: '#f59e0b' },
]

export const directMessages = [
  { id: 'marcos', person: people.marcos },
  { id: 'sofia', person: people.sofia },
  { id: 'alex', person: people.alex },
  { id: 'diseno', person: people.diseno, unread: 1 },
]

export const navItems = [
  { id: 'home', label: 'Home', icon: 'Home' },
  { id: 'tasks', label: 'Tareas', icon: 'CheckSquare' },
  { id: 'calendar', label: 'Calendario', icon: 'Calendar' },
  { id: 'chat', label: 'Chat', icon: 'MessageSquare', active: true, dot: true },
  { id: 'portal', label: 'Mi Portal', icon: 'LayoutGrid' },
  { id: 'leads', label: 'Leads', icon: 'Users' },
  { id: 'analytics', label: 'Analytics', icon: 'BarChart3' },
  { id: 'admin', label: 'Admin', icon: 'ShieldCheck' },
]

export const accounts = [
  { id: 'gestion', name: 'Gestión de cuentas', color: '#8b5cf6' },
  { id: 'boost', name: 'Boostmarketing', color: '#22d3ee' },
  { id: 'gymnas', name: 'GymnasTwin', color: '#10b981' },
  { id: 'imedi', name: 'IMEDI', color: '#f59e0b' },
  { id: 'josetwin', name: 'José Twin', color: '#ec4899' },
]

export const apps = [
  { id: 'approvals', label: 'Aprobaciones', icon: 'CheckCheck' },
  { id: 'meetings', label: 'Reuniones', icon: 'Video' },
  { id: 'files', label: 'Archivos', icon: 'Folder' },
  { id: 'notifications', label: 'Notificaciones', icon: 'Bell' },
  { id: 'ai', label: 'AI Assistant', icon: 'Sparkles' },
]
