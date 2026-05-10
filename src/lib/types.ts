export interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  color: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
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

export interface Task {
  id: string;
  userId: string;
  assignedUserId: string | null;
  clientId: string | null;
  title: string;
  description: string;
  status: string;
  priority: string;
  startDate: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string | null; email: string; color: string } | null;
  assignedUser?: { id: string; name: string | null; email: string; color: string } | null;
  client?: { id: string; name: string; company: string } | null;
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
  assignedManager?: { id: string; name: string | null; email: string; color: string } | null;
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
  createdAt: string;
  updatedAt: string;
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

export interface ChatMessage {
  id: string;
  userId: string;
  message: string;
  createdAt: string;
  user: { id: string; name: string | null; email: string; color: string; image: string | null };
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
  createdAt: string;
  updatedAt: string;
  assignedUser?: { id: string; name: string | null; email: string; color: string } | null;
  createdBy?: { id: string; name: string | null; email: string; color: string };
  client?: { id: string; name: string; company: string } | null;
}
