export interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  /** Solo aplica a clientes (videollamada / CRM). */
  lifecycleStatus?: string | null;
  color: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  meetUrl?: string;
  assignedUsers?: { user: { id: string; name: string | null; email: string; color: string; image: string | null } }[];
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  type: string;
  read: boolean;
  link: string | null;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  createdAt: string;
}

export interface TaskAssignee {
  id: string;
  name: string | null;
  email: string;
  color: string;
  image: string | null;
}

export interface Task {
  id: string;
  userId: string;
  assignedUserId: string | null;
  clientId: string | null;
  visibleToClient?: boolean;
  title: string;
  description: string;
  status: string;
  priority: string;
  visibility: string;
  references: { title: string; url: string; type: string }[];
  startDate: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string | null; email: string; color: string; image?: string | null } | null;
  assignedUser?: { id: string; name: string | null; email: string; color: string; image?: string | null } | null;
  assignedUsers?: TaskAssignee[];
  client?: { id: string; name: string; company: string } | null;
  isDeliverable?: boolean;
  deliverableStatus?: string | null;
  milestoneId?: string | null;
  parentTaskId?: string | null;
  archivedAt?: string | null;
  phase?: string | null;
  type?: string | null; // internal_task | deliverable | activity | review | change_request
  publishedAt?: string | null;
  milestone?: { id: string; title: string; status: string } | null;
}

export interface ActivityComment {
  id: string;
  activityId: string;
  userId: string;
  message: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    color: string;
    image: string | null;
    role: string;
  };
}

export interface ClientPortalData {
  client: Client;
  activities: Activity[];
  tasks: Task[];
  appointments?: Appointment[];
}

export interface Contact {
  id: string;
  userId: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  status: string;
  value: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  userId: string;
  assignedManagerId: string | null;
  name: string;
  email: string;
  company: string;
  phone: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  assignedManager?: { id: string; name: string | null; email: string; color: string; image: string | null } | null;
  assignedUsers?: ActivityAssignee[];
}

export interface DashboardStats {
  totalContacts: number;
  totalTasks: number;
  completedTasks: number;
  activeClients: number;
  totalRevenue: number;
  pendingDeals: number;
}

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
}

export interface SiteSettings {
  id: string;
  agencyName: string;
  logoUrl: string;
  faviconUrl: string;
  heroTitle: string;
  heroSubtitle: string;
  email: string;
  phone: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  linkedin: string;
  whatsapp: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  tags: string;
  projectUrl: string;
  order: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  company: string;
  text: string;
  imageUrl: string;
  rating: number;
  active: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  notes: string;
  status: string;
  clientId?: string | null;
  createdAt: string;
  updatedAt: string;
  meetUrl?: string;
  client?: { id: string; name: string; company: string } | null;
  assignedUsers?: { user: { id: string; name: string | null; email: string; color: string; image: string | null } }[];
}
export interface TeamMember {
  id: string;
  name: string;
  role: string;
  imageUrl: string;
  quote: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserPresence {
  id:       string;
  userId:   string;
  status:   'online' | 'away' | 'offline';
  lastSeen: string;
  user?: { id: string; name: string | null; email: string; color: string; image: string | null };
}

export interface ChatReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  user: { id: string; name: string | null; color: string };
}

export interface ChatMessage {
  id: string;
  userId: string;
  message: string;
  room: string;
  createdAt: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  taskId?: string | null;
  user: { id: string; name: string | null; email: string; color: string; image: string | null };
  reactions?: ChatReaction[];
}

export interface ActivityAssignee {
  id: string;
  name: string | null;
  email: string;
  color: string;
  image: string | null;
}

export interface Activity {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  startDate: string;
  endDate: string | null;
  assignedUserId: string | null;
  createdByUserId: string;
  clientId: string | null;
  visibleToClient?: boolean;
  createdAt: string;
  updatedAt: string;
  assignedUser?: ActivityAssignee | null;
  assignedUsers?: ActivityAssignee[];
  createdBy?: ActivityAssignee;
  client?: { id: string; name: string; company: string } | null;
  isDeliverable?: boolean;
  deliverableStatus?: string | null;
  milestoneId?: string | null;
  parentTaskId?: string | null;
  archivedAt?: string | null;
  phase?: string | null;
  type?: string | null; // internal_task | deliverable | activity | review | change_request
  publishedAt?: string | null;
  milestone?: { id: string; title: string; status: string } | null;
}

export interface Milestone {
  id: string;
  clientId: string;
  title: string;
  description: string;
  date: string;
  status: string; // upcoming | in_progress | review | completed | delayed
  type: string;
  progress: number;
  responsibleId: string | null;
  visibleToClient: boolean;
  comments: string;
  createdAt: string;
  updatedAt: string;
  responsible?: { id: string; name: string | null; email: string; color: string; image: string | null } | null;
}
