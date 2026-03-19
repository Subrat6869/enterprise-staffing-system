// ============================================
// ENTERPRISE STAFFING SYSTEM - TYPES
// ============================================

export type UserRole = 
  | 'admin' 
  | 'hr' 
  | 'general_manager' 
  | 'supervisor' 
  | 'project_manager' 
  | 'employee' 
  | 'intern' 
  | 'apprentice';

export interface User {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  departmentId?: string;
  photoURL?: string;
  phone?: string;
  phoneNumber?: string;       // Saved phone number for Phone OTP Auth
  phoneVerified?: boolean;    // Whether phone number has been OTP-verified
  createdAt: Date;
  updatedAt?: Date;
  isActive: boolean;
  employeeId?: string;
  qualification?: string;
  skills?: string[];
  experience?: number;
  certificateURL?: string; // For intern/apprentice bona-fide certificate
  certificateVerified?: boolean;
  isApproved?: boolean; // HR must approve employee/intern/apprentice before they can login
  assignedManager?: string;
  assignedSupervisor?: string;
  mfaEnabled?: boolean;   // Whether 2FA is enabled
  mfaSecret?: string;     // TOTP secret for Google Authenticator
}


export interface Department {
  id: string;
  name: string;
  description: string;
  headId?: string;
  headName?: string;
  employeeCount: number;
  projectCount: number;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Team {
  id: string;
  name: string;
  departmentId: string;
  supervisorId: string;
  memberIds: string[];
  description?: string;
  status: 'active' | 'inactive' | 'terminated';
  createdAt: Date;
  updatedAt?: Date;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  departmentId: string;
  departmentName: string;
  assignedManagerId: string;
  assignedManagerName: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  progress: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  startDate: Date;
  deadline: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
  teamMembers?: string[];
}

export interface Task {
  id: string;
  projectId: string;
  projectName: string;
  employeeId: string;
  employeeName: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  progress: number;
  assignedBy: string;
  assignedAt: Date;
  dueDate?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
  employeeComment?: string;
}

export interface DailyWork {
  id: string;
  employeeId: string;
  employeeName: string;
  projectId?: string;
  projectName?: string;
  taskId?: string;
  taskTitle?: string;
  date: Date;
  hoursWorked: number;
  description: string;
  accomplishments: string;
  challenges?: string;
  tomorrowPlan?: string;
  createdAt: Date;
}

export interface Report {
  id: string;
  employeeId: string;
  employeeName: string;
  type: 'daily' | 'weekly' | 'monthly';
  period: string;
  content: string;
  summary: string;
  fileURL?: string;
  submittedAt: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  status: 'pending' | 'approved' | 'rejected';
  feedback?: string;
}

export interface Notice {
  id: string;
  title: string;
  message: string;
  category: 'general' | 'urgent' | 'policy' | 'event';
  postedBy: string;
  postedByName: string;
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  targetRoles?: UserRole[];
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  link?: string;
  createdAt: Date;
}

export interface ChatMessage {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Analytics {
  totalEmployees: number;
  totalDepartments: number;
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  pendingTasks: number;
  completedTasks: number;
  departmentStats: DepartmentStat[];
  projectStats: ProjectStat[];
  employeePerformance: EmployeePerformance[];
}

export interface DepartmentStat {
  departmentId: string;
  departmentName: string;
  employeeCount: number;
  projectCount: number;
  taskCompletionRate: number;
}

export interface ProjectStat {
  projectId: string;
  projectName: string;
  progress: number;
  taskCount: number;
  completedTasks: number;
}

export interface EmployeePerformance {
  employeeId: string;
  employeeName: string;
  tasksCompleted: number;
  tasksPending: number;
  averageProgress: number;
  hoursLogged: number;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface RegistrationData {
  email: string;
  password: string;
  name: string;
  role: Exclude<UserRole, 'admin' | 'hr' | 'general_manager' | 'supervisor' | 'project_manager'>;
  department?: string;
  qualification?: string;
  certificate?: File;
}
