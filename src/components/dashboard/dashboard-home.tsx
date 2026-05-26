'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, Reorder, useDragControls } from 'framer-motion'
import {
  Plus,
  UserPlus,
  Mail,
  Calendar,
  ExternalLink,
  MessageSquare,
  Pencil,
  X,
} from 'lucide-react'
import { Sidebar } from '@/components/dashboard/sidebar'
import {
  TaskCard,
  StatCard,
  SectionWrapper,
  ActivityItem,
  MeetingItem,
  MessageItem,
  TeamMemberRow,
  Avatar,
  AvatarGroup,
  widthToSpan,
  type SectionWidth,
} from '@/components/dashboard/dashboard-components'
import {
  currentUser,
  mockTasks,
  mockActivities,
  mockMeetings,
  mockMessages,
  mockUsers,
  getStatsByRole,
  getQuickActionsByRole,
  getSectionsByRole,
  type UserRole,
} from '@/lib/dashboard-data'

const sectionTitles: Record<string, string> = {
  stats: 'Estadísticas',
  my_tasks: 'Mis tareas',
  workspace_activity: 'Actividad del workspace',
  team_today: 'Equipo hoy',
  upcoming_meetings: 'Próximas reuniones',
  recent_messages: 'Mensajes recientes',
  team_completed: 'Tareas completadas del equipo',
  recent_activity: 'Actividad reciente',
  overdue_tasks: 'Tareas vencidas',
  my_deliverables: 'Mis entregables',
  team_messages: 'Mensajes del equipo',
}

const quickActionIcons: Record<string, React.ElementType> = {
  Plus,
  UserPlus,
  Mail,
  Calendar,
  ExternalLink,
  MessageSquare,
}

// Default widths per section
const defaultWidths: Record<string, SectionWidth> = {
  my_tasks: 'full',
  my_deliverables: 'full',
  recent_messages: '1/2',
  team_messages: '1/2',
  upcoming_meetings: '1/2',
  team_today: '1/2',
  recent_activity: '1/2',
  workspace_activity: '1/2',
  team_completed: '1/3',
  overdue_tasks: '1/2',
}

interface SectionState {
  id: string
  width: SectionWidth
  visible: boolean
  collapsed: boolean
}

export default function DashboardHome() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [sections, setSections] = useState<SectionState[]>([])
  const [selectedRole, setSelectedRole] = useState<UserRole>(currentUser.role)
  const [greeting, setGreeting] = useState('Hola')
  const [formattedDate, setFormattedDate] = useState('')

  // Set greeting and date on client only to avoid hydration mismatch
  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Buenos días')
    else if (hour < 18) setGreeting('Buenas tardes')
    else setGreeting('Buenas noches')

    setFormattedDate(new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }))
  }, [])

  // Initialize sections based on role
  useEffect(() => {
    const savedSections = localStorage.getItem(`weeklink_sections_v2_${selectedRole}`)

    if (savedSections) {
      setSections(JSON.parse(savedSections))
    } else {
      const defaultSections = getSectionsByRole(selectedRole).map(id => ({
        id,
        width: defaultWidths[id] || '1/2' as SectionWidth,
        visible: true,
        collapsed: false,
      }))
      setSections(defaultSections)
    }
  }, [selectedRole])

  // Save sections to localStorage
  useEffect(() => {
    if (sections.length > 0) {
      localStorage.setItem(`weeklink_sections_v2_${selectedRole}`, JSON.stringify(sections))
    }
  }, [sections, selectedRole])

  const stats = getStatsByRole(selectedRole)
  const quickActions = getQuickActionsByRole(selectedRole)

  const updateSection = useCallback((id: string, updates: Partial<SectionState>) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
  }, [])

  const getRoleBadge = (role: UserRole) => {
    const badges: Record<UserRole, string> = {
      admin: 'Admin',
      project_manager: 'Project Manager',
      team_member: 'Team Member',
      designer: 'Designer',
      marketing: 'Marketing',
      sales: 'Sales Rep',
      client: 'Client',
    }
    return badges[role]
  }

  // Get content mode based on width
  const getContentMode = (width: SectionWidth): 'compact' | 'medium' | 'wide' => {
    if (width === '1/4' || width === '1/3') return 'compact'
    if (width === '1/2') return 'medium'
    return 'wide'
  }

  const renderSectionContent = (sectionId: string, width: SectionWidth) => {
    const mode = getContentMode(width)
    const isCompact = mode === 'compact'
    const isMedium = mode === 'medium'

    switch (sectionId) {
      case 'my_tasks':
      case 'my_deliverables':
        return (
          <div className={`${isCompact ? 'space-y-1' : 'space-y-3'}`}>
            {mockTasks.slice(0, isCompact ? 6 : 4).map(task => (
              <TaskCard key={task.id} task={task} compact={isCompact} />
            ))}
          </div>
        )
      case 'overdue_tasks':
        return (
          <div className={`${isCompact ? 'space-y-1' : 'space-y-3'}`}>
            {mockTasks.filter(t => t.dueDate === 'Vencida').map(task => (
              <TaskCard key={task.id} task={task} compact={isCompact} />
            ))}
          </div>
        )
      case 'workspace_activity':
      case 'recent_activity':
        return (
          <div className={`${isCompact ? 'space-y-0' : 'space-y-1 divide-y divide-white/[0.04]'}`}>
            {mockActivities.slice(0, isCompact ? 8 : 5).map(activity => (
              <ActivityItem key={activity.id} activity={activity} compact={isCompact} />
            ))}
          </div>
        )
      case 'team_today':
        return (
          <div className={`${isCompact ? 'space-y-0' : 'space-y-1'}`}>
            {mockUsers.filter(u => u.role !== 'client').slice(0, isCompact ? 6 : 4).map(user => (
              <TeamMemberRow 
                key={user.id} 
                user={user} 
                task={!isCompact ? mockTasks.find(t => t.assignee.id === user.id)?.title : undefined}
                compact={isCompact}
              />
            ))}
          </div>
        )
      case 'upcoming_meetings':
        return (
          <div className={`${isCompact ? 'space-y-0' : 'space-y-2'}`}>
            {mockMeetings.slice(0, isCompact ? 5 : 3).map(meeting => (
              <MeetingItem key={meeting.id} meeting={meeting} compact={isCompact} />
            ))}
          </div>
        )
      case 'recent_messages':
      case 'team_messages':
        return (
          <div className={`${isCompact ? 'space-y-0' : 'space-y-1 divide-y divide-white/[0.04]'}`}>
            {mockMessages.slice(0, isCompact ? 8 : 8).map(message => (
              <MessageItem key={message.id} message={message} compact={isCompact} />
            ))}
          </div>
        )
      case 'team_completed':
        if (isCompact) {
          return (
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-green-500/20 flex items-center justify-center">
                <span className="text-green-400 text-xs">✓</span>
              </div>
              <span className="text-[11px] text-white/80">18 completadas</span>
            </div>
          )
        }
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg bg-green-500/10 p-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
                  <span className="text-green-400 text-sm">✓</span>
                </div>
                <div>
                  <p className="text-[12px] font-medium text-white/85">18 tareas completadas</p>
                  <p className="text-[10px] text-white/50">Esta semana</p>
                </div>
              </div>
              <AvatarGroup users={mockUsers.slice(0, 4)} max={4} />
            </div>
          </div>
        )
      default:
        return null
    }
  }

  // organizeIntoRows eliminado — CSS grid-flow-row dense maneja el layout

  return (
    <div 
      className="min-h-screen"
      style={{
        background: 'radial-gradient(ellipse at 100% 100%, #160830 0%, #0e0e14 30%, #080808 60%)',
      }}
    >
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} 
      />

      <main 
        className="min-h-screen transition-all duration-200"
        style={{ marginLeft: sidebarCollapsed ? 72 : 260 }}
      >
        <div className="mx-auto max-w-7xl px-6 py-8">
          {/* Header */}
          <div className="mb-8 flex items-start justify-between">
            <div>
              <motion.h1 
                className="text-2xl font-semibold text-white/90"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {greeting}, {currentUser.name.split(' ')[0]}
              </motion.h1>
              <div className="mt-1 flex items-center gap-3">
                <span className="text-[13px] text-white/35 capitalize">{formattedDate}</span>
                <span className="rounded-full bg-violet-500/20 px-2.5 py-0.5 text-[10px] font-medium text-violet-300">
                  {getRoleBadge(selectedRole)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Role Selector (for demo) */}
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                className="h-9 rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 text-[12px] text-white/60 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
              >
                <option value="admin">Admin</option>
                <option value="project_manager">Project Manager</option>
                <option value="team_member">Team Member</option>
                <option value="designer">Designer</option>
                <option value="client">Client</option>
              </select>

              {/* Edit Mode Toggle */}
              <button
                onClick={() => setEditMode(!editMode)}
                className={`flex h-9 items-center gap-2 rounded-lg px-3 text-[12px] transition-colors ${
                  editMode 
                    ? 'bg-violet-500 text-white' 
                    : 'bg-white/[0.04] text-white/60 hover:bg-white/[0.06]'
                }`}
              >
                {editMode ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                {editMode ? 'Guardar' : 'Editar'}
              </button>

              <Avatar user={currentUser} size="lg" showStatus />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-6 flex flex-wrap gap-2">
            {quickActions.map((action) => {
              const Icon = quickActionIcons[action.icon]
              return (
                <motion.button
                  key={action.action}
                  className="flex h-9 items-center gap-2 rounded-lg bg-white/[0.04] px-4 text-[12px] text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white/90"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon className="h-4 w-4" />
                  {action.label}
                </motion.button>
              )
            })}
          </div>

          {/* Stats Row */}
          <div className="mb-6 flex gap-4 overflow-x-auto pb-2">
            {stats.map((stat) => (
              <StatCard 
                key={stat.label} 
                label={stat.label} 
                value={stat.value} 
                change={stat.change} 
              />
            ))}
          </div>

          {/* Resizable Sections Grid - 12 column system */}
          <Reorder.Group
            axis="y"
            as="div"
            values={sections.filter(s => s.visible || editMode).map(s => s.id)}
            onReorder={(newOrder) => {
              setSections(prev => {
                const sectionMap = new Map(prev.map(s => [s.id, s]))
                const visibleReordered = newOrder.map(id => sectionMap.get(id)!).filter(Boolean)
                const hidden = prev.filter(s => !s.visible && !editMode)
                return [...visibleReordered, ...hidden]
              })
            }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(12, 1fr)',
              gap: '1rem',
              gridAutoFlow: 'row dense',
            }}
          >
            {sections
              .filter(s => s.visible || editMode)
              .map((section) => (
                <Reorder.Item
                  key={section.id}
                  value={section.id}
                  as="div"
                  dragListener={editMode}
                  layout
                  style={{
                    gridColumn: `span ${widthToSpan[section.width]}`,
                  }}
                  transition={{ layout: { duration: 0.25, ease: 'easeInOut' } }}
                >
                  <SectionWrapper
                    id={section.id}
                    title={sectionTitles[section.id] || section.id}
                    editMode={editMode}
                    isVisible={section.visible}
                    isCollapsed={section.collapsed}
                    width={section.width}
                    onToggleVisibility={() => updateSection(section.id, { visible: !section.visible })}
                    onToggleCollapse={() => updateSection(section.id, { collapsed: !section.collapsed })}
                    onWidthChange={(newWidth) => updateSection(section.id, { width: newWidth })}
                    contentMode={getContentMode(section.width)}
                  >
                    {renderSectionContent(section.id, section.width)}
                  </SectionWrapper>
                </Reorder.Item>
              ))}
          </Reorder.Group>
        </div>
      </main>
    </div>
  )
}
