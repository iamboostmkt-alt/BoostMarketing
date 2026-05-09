export interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  color: string;
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
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
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
  name: string;
  email: string;
  company: string;
  phone: string;
  status: string;
  createdAt: string;
  updatedAt: string;
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
