"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, MoreHorizontal, Search } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

type Role = "Admin" | "Project Manager" | "Team Member" | "Designer" | "Marketing" | "Sales Rep"

interface Member {
  id: number
  name: string
  email: string
  role: Role
  avatar?: string
  initials: string
  invited?: boolean
}

const roles: Role[] = ["Admin", "Project Manager", "Team Member", "Designer", "Marketing", "Sales Rep"]

const initialMembers: Member[] = [
  { id: 1, name: "Lena Hartfield", email: "lena@hartfield.com", role: "Admin", avatar: "https://i.pravatar.cc/150?img=47", initials: "LH" },
  { id: 2, name: "Elliot Grayson", email: "elliot@grayson.com", role: "Project Manager", avatar: "https://i.pravatar.cc/150?img=12", initials: "EG" },
  { id: 3, name: "Chantal Shelburne", email: "chloe@agency.com", role: "Team Member", avatar: "https://i.pravatar.cc/150?img=25", initials: "CS" },
  { id: 4, name: "Tyra Dhillon", email: "tyra@agency.com", role: "Designer", avatar: "https://i.pravatar.cc/150?img=32", initials: "TD" },
  { id: 5, name: "Brittni Lando", email: "brittni@agency.com", role: "Marketing", avatar: "https://i.pravatar.cc/150?img=15", initials: "BL" },
  { id: 6, name: "Lauralee Quintero", email: "laura@agency.com", role: "Sales Rep", avatar: "https://i.pravatar.cc/150?img=53", initials: "LQ" },
  { id: 7, name: "Ronald Richards", email: "ronald@email.com", role: "Team Member", initials: "RR", invited: true },
  { id: 8, name: "Dianne Russell", email: "dianne@email.com", role: "Team Member", initials: "DR", invited: true },
]

// Custom Role Select Component
interface RoleSelectProps {
  value: Role
  onChange: (role: Role) => void
  size?: "sm" | "lg"
}

function RoleSelect({ value, onChange, size = "sm" }: RoleSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen])

  const handleSelect = (role: Role) => {
    onChange(role)
    setIsOpen(false)
  }

  const isLarge = size === "lg"

  return (
    <div className="relative" ref={containerRef}>
      {/* Pill button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 transition-all"
        style={{
          height: isLarge ? 38 : 26,
          padding: isLarge ? "0 14px" : "0 10px",
          borderRadius: 20,
          background: isOpen ? "rgba(124,58,237,0.08)" : "#1a1a1f",
          border: isOpen ? "1px solid rgba(124,58,237,0.40)" : "1px solid rgba(255,255,255,0.08)",
          fontSize: isLarge ? 13 : 11,
          fontWeight: 500,
          color: isOpen ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.55)",
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)"
            e.currentTarget.style.color = "rgba(255,255,255,0.75)"
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"
            e.currentTarget.style.color = "rgba(255,255,255,0.55)"
          }
        }}
      >
        <span>{value}</span>
        <ChevronDown 
          className="transition-transform" 
          style={{ 
            width: isLarge ? 14 : 12, 
            height: isLarge ? 14 : 12,
            color: "rgba(255,255,255,0.25)",
            marginLeft: 4,
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)"
          }} 
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-1.5 overflow-hidden shadow-2xl"
            style={{
              minWidth: 160,
              background: "#16161e",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
              padding: "4px 0",
            }}
          >
            {roles.map((role) => {
              const isSelected = role === value
              return (
                <button
                  key={role}
                  onClick={() => handleSelect(role)}
                  className="relative flex w-full items-center transition-colors"
                  style={{
                    padding: "7px 12px",
                    fontSize: 12,
                    borderRadius: 0,
                    background: isSelected ? "#1a1a1a" : "transparent",
                    color: isSelected ? "#a78bfa" : "rgba(255,255,255,0.60)",
                    fontWeight: isSelected ? 500 : 400,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "rgba(255,255,255,0.05)"
                      e.currentTarget.style.color = "rgba(255,255,255,0.90)"
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "transparent"
                      e.currentTarget.style.color = "rgba(255,255,255,0.60)"
                    }
                  }}
                >
                  {/* Purple gradient overlay for selected */}
                  {isSelected && (
                    <div
                      className="pointer-events-none absolute inset-y-0 right-0 w-full"
                      style={{
                        background: "linear-gradient(to left, rgba(124,58,237,0.25) 0%, rgba(124,58,237,0.05) 50%, transparent 100%)",
                      }}
                    />
                  )}
                  
                  {/* Left border accent for selected */}
                  {isSelected && (
                    <div
                      className="absolute left-0 top-0 h-full"
                      style={{
                        width: 2,
                        background: "#7c3aed",
                      }}
                    />
                  )}

                  <span className="relative z-10">{role}</span>

                  {/* Right dot for selected */}
                  {isSelected && (
                    <div
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#8b5cf6",
                      }}
                    />
                  )}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function TeamMembersSettings() {
  const [members, setMembers] = useState<Member[]>(initialMembers)
  const [email, setEmail] = useState("")
  const [selectedRole, setSelectedRole] = useState<Role>("Team Member")
  const [searchQuery, setSearchQuery] = useState("")
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [changedRoleId, setChangedRoleId] = useState<number | null>(null)

  const activeMembers = members.filter((m) => !m.invited)
  const invitedMembers = members.filter((m) => m.invited)

  const filteredActiveMembers = activeMembers.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredInvitedMembers = invitedMembers.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const showToast = (message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  const handleInvite = () => {
    if (!email) return
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      showToast("Please enter a valid email address")
      return
    }

    const newMember: Member = {
      id: Date.now(),
      name: email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      email,
      role: selectedRole,
      initials: email.slice(0, 2).toUpperCase(),
      invited: true,
    }
    setMembers([...members, newMember])
    setEmail("")
    showToast(`Invitation sent to ${email}`)
  }

  const handleRoleChange = (id: number, role: Role) => {
    setMembers(members.map((m) => (m.id === id ? { ...m, role } : m)))
    setChangedRoleId(id)
    setTimeout(() => setChangedRoleId(null), 300)
  }

  const handleRemoveMember = (id: number) => {
    setMembers(members.filter((m) => m.id !== id))
    setOpenMenuId(null)
    showToast("Member removed")
  }

  const handleResendInvite = (email: string) => {
    setOpenMenuId(null)
    showToast(`Invitation resent to ${email}`)
  }

  return (
    <div 
      className="min-h-screen p-6 md:p-10"
      style={{ background: "linear-gradient(180deg, #0a0a0a 0%, #0f0f0f 50%, #0a0a0a 100%)" }}
    >
      <div className="mx-auto max-w-3xl space-y-4">
        {/* Section 1: Invite members */}
        <div className="rounded-xl border border-[var(--wl-border)] bg-[#16161e] p-5 px-6">
          <h2 className="text-[15px] font-medium text-[rgba(255,255,255,0.90)]">Invite members</h2>
          <p className="mt-1 text-[13px] text-[rgba(255,255,255,0.40)]">
            Add new members by entering their email address
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              className="h-[38px] flex-1 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#1a1a1f] px-4 text-sm text-[rgba(255,255,255,0.70)] placeholder-[rgba(255,255,255,0.25)] outline-none transition-all focus:border-[rgba(124,58,237,0.5)] focus:ring-2 focus:ring-[rgba(124,58,237,0.15)]"
            />
            <RoleSelect value={selectedRole} onChange={setSelectedRole} size="lg" />
            <motion.button
              onClick={handleInvite}
              whileHover={{ backgroundColor: "#6d28d9" }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="h-[38px] rounded-lg bg-[#7c3aed] px-6 text-sm font-medium text-white"
            >
              Invite
            </motion.button>
          </div>
        </div>

        {/* Section 2: People with access */}
        <div className="rounded-xl border border-[var(--wl-border)] bg-[#16161e] p-5 px-6">
          <div className="flex items-center gap-3">
            <h2 className="text-[14px] font-medium text-[rgba(255,255,255,0.80)]">People with access</h2>
            <span className="rounded-full border border-[rgba(124,58,237,0.20)] bg-[rgba(124,58,237,0.12)] px-2.5 py-0.5 text-[11px] font-medium text-[#a78bfa]">
              {members.length} members
            </span>
          </div>

          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[rgba(255,255,255,0.25)]" />
            <input
              type="text"
              placeholder="Buscar miembros..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-[38px] w-full rounded-lg border border-[var(--wl-border)] bg-[#1a1a1f] pl-10 pr-4 text-sm text-[rgba(255,255,255,0.70)] placeholder-[rgba(255,255,255,0.25)] outline-none transition-all focus:border-[rgba(124,58,237,0.5)] focus:ring-2 focus:ring-[rgba(124,58,237,0.15)]"
            />
          </div>

          <div className="my-3 h-px bg-[rgba(255,255,255,0.06)]" />

          {/* Active members */}
          <div className="space-y-0.5">
            <AnimatePresence mode="popLayout">
              {filteredActiveMembers.map((member, index) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  index={index}
                  onRoleChange={handleRoleChange}
                  onRemove={handleRemoveMember}
                  onResend={handleResendInvite}
                  isMenuOpen={openMenuId === member.id}
                  onMenuToggle={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
                  onCloseMenu={() => setOpenMenuId(null)}
                  roleChanged={changedRoleId === member.id}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Invited members */}
          {filteredInvitedMembers.length > 0 && (
            <>
              <div className="mb-2 mt-5 text-xs font-medium text-[rgba(255,255,255,0.40)]">
                Invited people
              </div>
              <div className="space-y-0.5">
                <AnimatePresence mode="popLayout">
                  {filteredInvitedMembers.map((member, index) => (
                    <MemberRow
                      key={member.id}
                      member={member}
                      index={index}
                      onRoleChange={handleRoleChange}
                      onRemove={handleRemoveMember}
                      onResend={handleResendInvite}
                      isMenuOpen={openMenuId === member.id}
                      onMenuToggle={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
                      onCloseMenu={() => setOpenMenuId(null)}
                      roleChanged={changedRoleId === member.id}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </>
          )}

          {filteredActiveMembers.length === 0 && filteredInvitedMembers.length === 0 && (
            <div className="py-8 text-center text-sm text-[rgba(255,255,255,0.40)]">No members found</div>
          )}
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed right-6 top-6 z-50 flex items-center gap-2 rounded-lg border border-[rgba(124,58,237,0.30)] bg-[#16161e] px-4 py-3 text-sm text-[rgba(255,255,255,0.90)] shadow-lg"
          >
            <svg className="h-4 w-4 text-[#7c3aed]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface MemberRowProps {
  member: Member
  index: number
  onRoleChange: (id: number, role: Role) => void
  onRemove: (id: number) => void
  onResend: (email: string) => void
  isMenuOpen: boolean
  onMenuToggle: () => void
  onCloseMenu: () => void
  roleChanged: boolean
}

function MemberRow({ member, index, onRoleChange, onRemove, onResend, isMenuOpen, onMenuToggle, onCloseMenu, roleChanged }: MemberRowProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onCloseMenu()
      }
    }
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isMenuOpen, onCloseMenu])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.15, delay: index * 0.04 }}
      whileHover={{ backgroundColor: "rgba(255,255,255,0.03)" }}
      className="flex items-center justify-between rounded-lg px-1 py-2.5"
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        {member.avatar && !member.invited ? (
          <img
            src={member.avatar}
            alt={member.name}
            className="h-9 w-9 rounded-full object-cover"
          />
        ) : (
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-medium ${
              member.invited
                ? "border-[1.5px] border-dashed border-[rgba(255,255,255,0.18)] bg-transparent text-[rgba(255,255,255,0.40)]"
                : "bg-[rgba(124,58,237,0.20)] text-[#a78bfa]"
            }`}
          >
            {member.initials}
          </div>
        )}

        <div>
          <div className="flex items-center gap-2">
            <span className={`text-[13px] font-medium ${member.invited ? "text-[rgba(255,255,255,0.55)]" : "text-[rgba(255,255,255,0.85)]"}`}>
              {member.name}
            </span>
            {member.invited && (
              <span className="rounded-full border border-[rgba(234,179,8,0.20)] bg-[rgba(234,179,8,0.12)] px-2 py-0.5 text-[10px] font-medium text-[#EAB308]">
                Invited
              </span>
            )}
          </div>
          <div className={`text-[12px] ${member.invited ? "text-[rgba(255,255,255,0.25)]" : "text-[rgba(255,255,255,0.30)]"}`}>
            {member.email}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Role select */}
        <motion.div 
          animate={roleChanged ? { scale: [1, 1.05, 1] } : {}}
          transition={{ duration: 0.2 }}
        >
          <RoleSelect 
            value={member.role} 
            onChange={(role) => onRoleChange(member.id, role)} 
            size="sm"
          />
        </motion.div>

        {/* Menu button */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={onMenuToggle}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[rgba(255,255,255,0.25)] transition-colors hover:bg-[rgba(255,255,255,0.05)] hover:text-[rgba(255,255,255,0.50)]"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full z-10 mt-1 w-40 overflow-hidden rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[#16161e] py-1 shadow-xl"
              >
                {member.invited ? (
                  <button
                    onClick={() => onResend(member.email)}
                    className="flex w-full items-center px-3 py-2 text-left text-[12px] text-[rgba(255,255,255,0.70)] transition-colors hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--wl-text-primary)]"
                  >
                    Resend invite
                  </button>
                ) : (
                  <button
                    onClick={() => onRemove(member.id)}
                    className="flex w-full items-center px-3 py-2 text-left text-[12px] text-red-400 transition-colors hover:bg-[rgba(239,68,68,0.08)]"
                  >
                    Remove member
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
