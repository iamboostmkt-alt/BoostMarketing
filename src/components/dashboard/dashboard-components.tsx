'use client'

import { motion } from 'framer-motion'
import { 
  GripVertical, 
  Eye, 
  EyeOff, 
  ChevronDown, 
  ChevronUp,
  MessageCircle,
  Paperclip,
  Clock,
  Video,
  Phone,
  Users,
  GripHorizontal
} from 'lucide-react'
import { useState, useRef, useCallback } from 'react'
import type { Task, Activity, Meeting, Message, User } from '@/lib/dashboard-data'

// Width snap points (as fractions of 12-column grid)
export type SectionWidth = '1/4' | '1/3' | '1/2' | '2/3' | 'full'

const widthToSpan: Record<SectionWidth, number> = {
  '1/4': 3,
  '1/3': 4,
  '1/2': 6,
  '2/3': 8,
  'full': 12,
}

const spanToWidth: Record<number, SectionWidth> = {
  3: '1/4',
  4: '1/3',
  6: '1/2',
  8: '2/3',
  12: 'full',
}

// Task Card Component with adaptive content
export function TaskCard({ task, compact = false }: { task: Task; compact?: boolean }) {
  const priorityColors = {
    urgent: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-violet-500',
    low: 'bg-slate-500',
  }

  const statusLabels = {
    todo: 'Por hacer',
    in_progress: 'En progreso',
    review: 'En revisión',
    done: 'Completada',
  }

  const statusColors = {
    todo: 'bg-slate-500/20 text-slate-300',
    in_progress: 'bg-amber-500/20 text-amber-300',
    review: 'bg-blue-500/20 text-blue-300',
    done: 'bg-green-500/20 text-green-300',
  }

  if (compact) {
    return (
      <motion.div
        className="relative overflow-hidden rounded-lg border border-white/[0.06] px-3 py-2"
        style={{
          background: 'linear-gradient(135deg, #080808 0%, #0e0e14 100%)',
        }}
        whileHover={{ borderColor: 'rgba(124, 58, 237, 0.2)' }}
      >
        <div className={`absolute top-0 left-0 h-full w-0.5 ${priorityColors[task.priority]}`} />
        <div className="pl-2 flex items-center justify-between gap-2">
          <span className="text-[11px] text-white/85 truncate flex-1">{task.title}</span>
          <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${statusColors[task.status]}`}>
            {statusLabels[task.status].split(' ')[0]}
          </span>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      className="relative overflow-hidden rounded-[14px] border border-white/[0.06] p-4"
      style={{
        background: 'linear-gradient(135deg, #080808 0%, #0e0e14 100%)',
      }}
      whileHover={{ y: -2, borderColor: 'rgba(124, 58, 237, 0.2)' }}
      transition={{ duration: 0.2 }}
    >
      {/* Purple glow */}
      <div 
        className="absolute -right-10 -bottom-10 h-32 w-32 opacity-60"
        style={{
          background: 'radial-gradient(circle, rgba(88, 28, 220, 0.18) 0%, transparent 70%)',
          filter: 'blur(20px)',
        }}
      />
      
      {/* Priority indicator */}
      <div className={`absolute top-0 left-0 h-full w-1 ${priorityColors[task.priority]}`} />
      
      <div className="relative z-10 pl-3">
        {/* Due date */}
        {task.dueDate && (
          <div className="mb-2 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-white/35" />
            <span className={`text-[11px] ${task.dueDate === 'Vencida' ? 'text-red-400' : 'text-white/35'}`}>
              {task.dueDate}
            </span>
          </div>
        )}
        
        {/* Title */}
        <h4 className="mb-2 text-[13px] leading-snug text-white/85">{task.title}</h4>
        
        {/* Tags row */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium ${statusColors[task.status]}`}>
            {statusLabels[task.status]}
          </span>
          <span className="text-[10px] text-violet-400/60">{task.client}</span>
        </div>
        
        {/* Bottom row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-white/35">
            <span className="flex items-center gap-1 text-[10px]">
              <MessageCircle className="h-3 w-3" />
              {task.comments}
            </span>
            <span className="flex items-center gap-1 text-[10px]">
              <Paperclip className="h-3 w-3" />
              {task.attachments}
            </span>
          </div>
          <Avatar user={task.assignee} size="sm" />
        </div>
      </div>
    </motion.div>
  )
}

// Avatar Component
export function Avatar({ user, size = 'md', showStatus = false }: { user: User; size?: 'sm' | 'md' | 'lg'; showStatus?: boolean }) {
  const sizes = {
    sm: 'h-6 w-6 text-[10px]',
    md: 'h-8 w-8 text-xs',
    lg: 'h-10 w-10 text-sm',
  }

  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-slate-500',
    busy: 'bg-amber-500',
  }

  const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2)
  const colors = ['bg-violet-600', 'bg-blue-600', 'bg-emerald-600', 'bg-amber-600', 'bg-rose-600']
  const colorIndex = user.id.charCodeAt(0) % colors.length

  return (
    <div className="relative">
      <div className={`${sizes[size]} ${colors[colorIndex]} flex items-center justify-center rounded-full font-medium text-white`}>
        {initials}
      </div>
      {showStatus && (
        <div className={`absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#080808] ${statusColors[user.status]}`} />
      )}
    </div>
  )
}

// Avatar Group Component
export function AvatarGroup({ users, max = 3 }: { users: User[]; max?: number }) {
  const displayed = users.slice(0, max)
  const remaining = users.length - max

  return (
    <div className="flex -space-x-2">
      {displayed.map((user) => (
        <div key={user.id} className="rounded-full ring-2 ring-[#080808]">
          <Avatar user={user} size="sm" />
        </div>
      ))}
      {remaining > 0 && (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[10px] text-white/60 ring-2 ring-[#080808]">
          +{remaining}
        </div>
      )}
    </div>
  )
}

// Section Wrapper Component with Resize
interface SectionWrapperProps {
  id: string
  title: string
  children: React.ReactNode
  editMode: boolean
  isVisible: boolean
  isCollapsed: boolean
  width: SectionWidth
  onToggleVisibility: () => void
  onToggleCollapse: () => void
  onWidthChange: (width: SectionWidth) => void
  contentMode?: 'compact' | 'medium' | 'wide'
}

export function SectionWrapper({
  title,
  children,
  editMode,
  isVisible,
  isCollapsed,
  width,
  onToggleVisibility,
  onToggleCollapse,
  onWidthChange,
  contentMode = 'wide',
}: SectionWrapperProps) {
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHover, setResizeHover] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    if (!editMode) return
    e.preventDefault()
    setIsResizing(true)

    const containerWidth = containerRef.current?.parentElement?.clientWidth || 0
    const columnWidth = containerWidth / 12
    let lastSnappedX = e.clientX
    let accumulated = 0
    const DEAD_ZONE = columnWidth * 0.55

    const handleMouseMove = (moveEvent: MouseEvent) => {
      accumulated += moveEvent.clientX - lastSnappedX
      lastSnappedX = moveEvent.clientX

      if (Math.abs(accumulated) < DEAD_ZONE) return

      const currentSpan = widthToSpan[width]
      const direction = accumulated > 0 ? 1 : -1
      const stepsRaw = Math.floor(Math.abs(accumulated) / DEAD_ZONE)
      const newSpanRaw = currentSpan + direction * stepsRaw

      const validSpans = [3, 4, 6, 8, 12]
      const clamped = Math.max(3, Math.min(12, newSpanRaw))
      const closestSpan = validSpans.reduce((prev, curr) =>
        Math.abs(curr - clamped) < Math.abs(prev - clamped) ? curr : prev
      )

      const newWidth = spanToWidth[closestSpan]
      if (newWidth && newWidth !== width) {
        onWidthChange(newWidth)
        accumulated = 0
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [editMode, width, onWidthChange])

  if (!isVisible && !editMode) return null

  const widthLabel = {
    '1/4': '25%',
    '1/3': '33%',
    '1/2': '50%',
    '2/3': '66%',
    'full': '100%',
  }

  return (
    <motion.div
      ref={containerRef}
      className={`relative rounded-[14px] border p-4 ${
        editMode ? 'border-dashed border-violet-500/40' : 'border-white/[0.06]'
      } ${!isVisible ? 'opacity-60' : ''}`}
      style={{
        background: 'linear-gradient(135deg, #080808 0%, #0e0e14 60%, #0a0a0f 100%)',
      }}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: isVisible ? 1 : 0.6, y: 0 }}
      transition={{ duration: 0.2, layout: { duration: 0.3 } }}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {editMode && (
            <span className="cursor-grab text-white/35 hover:text-white/60">
              <GripVertical className="h-4 w-4" />
            </span>
          )}
          <h3 className="text-[13px] font-medium text-white/90">{title}</h3>
          {editMode && (
            <span className="text-[10px] text-white/30 ml-2">{widthLabel[width]}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {editMode && (
            <button onClick={onToggleVisibility} className="text-white/35 hover:text-white/60">
              {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
          )}
          <button onClick={onToggleCollapse} className="text-white/35 hover:text-white/60">
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Content */}
      <motion.div
        initial={false}
        animate={{ height: isCollapsed ? 0 : 'auto', opacity: isCollapsed ? 0 : 1 }}
        transition={{ duration: 0.2 }}
        className="overflow-hidden"
      >
        {children}
      </motion.div>

      {/* Resize Handle */}
      {editMode && (
        <motion.div
          className="absolute top-0 right-0 h-full w-3 cursor-ew-resize flex items-center justify-center group"
          onMouseDown={handleResizeStart}
          onMouseEnter={() => setResizeHover(true)}
          onMouseLeave={() => !isResizing && setResizeHover(false)}
          initial={{ opacity: 0 }}
          animate={{ opacity: resizeHover || isResizing ? 1 : 0.3 }}
          whileHover={{ opacity: 1 }}
        >
          <div className={`h-16 w-1 rounded-full transition-colors ${isResizing ? 'bg-violet-500' : 'bg-white/20'}`}>
            <div className="h-full flex flex-col items-center justify-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className={`h-1 w-1 rounded-full ${isResizing ? 'bg-violet-300' : 'bg-white/40'}`} />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}

// Activity Item Component with compact mode
export function ActivityItem({ activity, compact = false }: { activity: Activity; compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 py-1.5">
        <Avatar user={activity.user} size="sm" />
        <span className="text-[10px] text-white/60 truncate flex-1">
          <span className="text-white/80">{activity.user.name.split(' ')[0]}</span> {activity.action}
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 py-2">
      <Avatar user={activity.user} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] leading-relaxed text-white/60">
          <span className="font-medium text-white/85">{activity.user.name}</span>{' '}
          {activity.action}{' '}
          <span className="text-violet-400/80">{activity.target}</span>
        </p>
        <span className="text-[10px] text-white/35">{activity.timestamp}</span>
      </div>
    </div>
  )
}

// Meeting Item Component with compact mode
export function MeetingItem({ meeting, compact = false }: { meeting: Meeting; compact?: boolean }) {
  const icons = {
    video: Video,
    call: Phone,
    in_person: Users,
  }
  const Icon = icons[meeting.type]

  if (compact) {
    return (
      <div className="flex items-center gap-2 py-1.5">
        <div className="flex h-6 w-6 items-center justify-center rounded bg-violet-500/20">
          <Icon className="h-3 w-3 text-violet-400" />
        </div>
        <span className="text-[11px] text-white/80 truncate flex-1">{meeting.title}</span>
        <span className="text-[10px] text-white/35 shrink-0">{meeting.time.split(' ')[0]}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-lg bg-white/[0.03] p-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/20">
        <Icon className="h-4 w-4 text-violet-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-[12px] font-medium text-white/85">{meeting.title}</p>
        <p className="text-[10px] text-white/35">{meeting.time}</p>
      </div>
      <AvatarGroup users={meeting.participants} max={3} />
    </div>
  )
}

// Message Item Component with compact mode
export function MessageItem({ message, compact = false }: { message: Message; compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 py-1.5">
        <Avatar user={message.sender} size="sm" />
        <span className="text-[11px] text-white/80 truncate flex-1">{message.sender.name.split(' ')[0]}</span>
        {message.unread && <span className="h-1.5 w-1.5 rounded-full bg-violet-500 shrink-0" />}
      </div>
    )
  }

  return (
    <div className={`flex items-start gap-3 py-2 ${message.unread ? 'bg-violet-500/5 -mx-2 px-2 rounded-lg' : ''}`}>
      <Avatar user={message.sender} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium text-white/85">{message.sender.name}</span>
          {message.unread && <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />}
        </div>
        <p className="truncate text-[11px] text-white/50">{message.preview}</p>
        <span className="text-[10px] text-white/35">{message.timestamp}</span>
      </div>
    </div>
  )
}

// Team Member Row Component with compact mode
export function TeamMemberRow({ user, task, compact = false }: { user: User; task?: string; compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 py-1.5">
        <Avatar user={user} size="sm" showStatus />
        <span className="text-[11px] text-white/80 truncate">{user.name.split(' ')[0]}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 py-2">
      <Avatar user={user} size="md" showStatus />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-white/85">{user.name}</p>
        {task && <p className="truncate text-[10px] text-white/50">{task}</p>}
      </div>
      <div className="flex items-center gap-1">
        <div className="h-1 w-6 rounded-full bg-violet-500/60" />
        <div className="h-1 w-4 rounded-full bg-violet-500/40" />
        <div className="h-1 w-2 rounded-full bg-violet-500/20" />
      </div>
    </div>
  )
}

// Stat Card Component
export function StatCard({ label, value, change, mini = false }: { label: string; value: number; change?: number; mini?: boolean }) {
  const [displayValue, setDisplayValue] = useState(0)

  useState(() => {
    const duration = 1000
    const steps = 30
    const increment = value / steps
    let current = 0
    const interval = setInterval(() => {
      current += increment
      if (current >= value) {
        setDisplayValue(value)
        clearInterval(interval)
      } else {
        setDisplayValue(Math.floor(current))
      }
    }, duration / steps)
    return () => clearInterval(interval)
  })

  if (mini) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-white/35">{label}</span>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-semibold text-white/90">{displayValue}</span>
          {change !== undefined && (
            <span className={`text-[10px] ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {change >= 0 ? '+' : ''}{change}%
            </span>
          )}
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="flex-1 rounded-[14px] border border-white/[0.06] p-4"
      style={{
        background: 'linear-gradient(135deg, #080808 0%, #0e0e14 100%)',
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <span className="text-[11px] text-white/35">{label}</span>
      <div className="mt-1 flex items-baseline gap-2">
        <motion.span 
          className="text-3xl font-semibold text-white/90"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {displayValue}{label.includes('rate') || label.includes('Plan') ? '%' : ''}
        </motion.span>
        {change !== undefined && (
          <span className={`rounded-full px-2 py-0.5 text-[10px] ${change >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {change >= 0 ? '+' : ''}{change}%
          </span>
        )}
      </div>
    </motion.div>
  )
}

// Export width utilities
export { widthToSpan, spanToWidth, type SectionWidth }
