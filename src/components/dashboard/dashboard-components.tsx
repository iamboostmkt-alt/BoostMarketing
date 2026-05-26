'use client'

import { motion } from 'framer-motion'
import { Eye, EyeOff, ChevronDown, ChevronUp, GripVertical } from 'lucide-react'
import { useState, useRef, useCallback } from 'react'

export type SectionWidth = '1/4' | '1/3' | '1/2' | '2/3' | 'full'

export const widthToSpan: Record<SectionWidth, number> = {
  '1/4': 3,
  '1/3': 4,
  '1/2': 6,
  '2/3': 8,
  'full': 12,
}

export const spanToWidth: Record<number, SectionWidth> = {
  3: '1/4',
  4: '1/3',
  6: '1/2',
  8: '2/3',
  12: 'full',
}

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

  const widthLabel: Record<SectionWidth, string> = {
    '1/4': '25%', '1/3': '33%', '1/2': '50%', '2/3': '66%', 'full': '100%',
  }

  return (
    <motion.div
      ref={containerRef}
      className={`relative rounded-[14px] border p-4 h-full ${
        editMode ? 'border-dashed border-violet-500/40' : 'border-white/[0.06]'
      } ${!isVisible ? 'opacity-60' : ''}`}
      style={{ background: 'linear-gradient(135deg, #080808 0%, #0e0e14 60%, #0a0a0f 100%)' }}
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: isVisible ? 1 : 0.6, y: 0 }}
      transition={{ duration: 0.2, layout: { duration: 0.3 } }}
    >
      <div className="absolute -right-8 -bottom-8 h-28 w-28 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(88,28,220,0.18) 0%, transparent 70%)', filter: 'blur(16px)' }} />

      <div className="relative z-10 mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {editMode && (
            <span className="cursor-grab text-white/35 hover:text-white/60 active:cursor-grabbing">
              <GripVertical className="h-4 w-4" />
            </span>
          )}
          <h3 className="text-[13px] font-medium text-white/90">{title}</h3>
          {editMode && (
            <span className="text-[10px] text-white/25 ml-1">{widthLabel[width]}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {editMode && (
            <button onClick={onToggleVisibility} className="text-white/35 hover:text-white/60 transition-colors">
              {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
          )}
          <button onClick={onToggleCollapse} className="text-white/35 hover:text-white/60 transition-colors">
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <motion.div
        className="relative z-10 overflow-hidden"
        initial={false}
        animate={{ height: isCollapsed ? 0 : 'auto', opacity: isCollapsed ? 0 : 1 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>

      {editMode && (
        <motion.div
          className="absolute top-0 right-0 h-full w-3 cursor-ew-resize flex items-center justify-center"
          onMouseDown={handleResizeStart}
          onMouseEnter={() => setResizeHover(true)}
          onMouseLeave={() => !isResizing && setResizeHover(false)}
          animate={{ opacity: resizeHover || isResizing ? 1 : 0.3 }}
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
