// ============================================
// DEMO USERS DATA
// ============================================

import type { User, UserRole } from '@/types';

export interface DemoUser {
  email: string;
  password: string;
  userData: Omit<User, 'uid'>;
}

export const demoUsers: DemoUser[] = [
  {
    email: 'adsubrat@gmail.com',
    password: 'adsubrat123',
    userData: {
      email: 'adsubrat@gmail.com',
      name: 'System Administrator',
      role: 'admin' as UserRole,
      department: 'System',
      areaCode: '001',
      areaName: 'MAHANADI COAL FIELD',
      createdAt: new Date(),
      isActive: true,
      phone: '+91-9876543210',
      employeeId: 'EMP001'
    }
  },
  {
    email: 'hrsubh123@gmail.com',
    password: 'hrsubh123',
    userData: {
      email: 'hrsubh123@gmail.com',
      name: 'HR Manager',
      role: 'hr' as UserRole,
      department: 'Support + HR',
      areaCode: '001',
      areaName: 'MAHANADI COAL FIELD',
      createdAt: new Date(),
      isActive: true,
      phone: '+91-9876543211',
      employeeId: 'EMP002',
      qualification: 'MBA in Human Resources'
    }
  },
  {
    email: 'gmsubh123@gmail.com',
    password: 'gmsubh123',
    userData: {
      email: 'gmsubh123@gmail.com',
      name: 'General Manager',
      role: 'general_manager' as UserRole,
      department: 'Operations',
      areaCode: '001',
      areaName: 'MAHANADI COAL FIELD',
      createdAt: new Date(),
      isActive: true,
      phone: '+91-9876543212',
      employeeId: 'EMP003',
      qualification: 'MBA in Business Administration',
      experience: 15
    }
  },
  {
    email: 'subrats444@gmail.com',
    password: 'subratsss123',
    userData: {
      email: 'subrats444@gmail.com',
      name: 'Department Supervisor',
      role: 'supervisor' as UserRole,
      department: 'Operations',
      areaCode: '001',
      areaName: 'MAHANADI COAL FIELD',
      createdAt: new Date(),
      isActive: true,
      phone: '+91-9876543213',
      employeeId: 'EMP004',
      qualification: 'MS in Computer Science',
      experience: 10,
      skills: ['Team Management', 'Project Planning', 'Agile']
    }
  },
  {
    email: 'pmsubh123@gmail.com',
    password: 'pmsubh123',
    userData: {
      email: 'pmsubh123@gmail.com',
      name: 'Project Manager',
      role: 'project_manager' as UserRole,
      department: 'Project',
      areaCode: '001',
      areaName: 'MAHANADI COAL FIELD',
      createdAt: new Date(),
      isActive: true,
      phone: '+91-9876543214',
      employeeId: 'EMP005',
      qualification: 'PMP Certified, MBA',
      experience: 8,
      skills: ['Project Management', 'Scrum', 'JIRA', 'Risk Management']
    }
  },
  {
    email: 'employee@enterprise.com',
    password: 'Emp@123',
    userData: {
      email: 'employee@enterprise.com',
      name: 'John Employee',
      role: 'employee' as UserRole,
      department: 'System',
      areaCode: '001',
      areaName: 'MAHANADI COAL FIELD',
      createdAt: new Date(),
      isActive: true,
      phone: '+1-555-0106',
      employeeId: 'EMP006',
      qualification: 'BS in Computer Science',
      experience: 3,
      skills: ['JavaScript', 'React', 'Node.js', 'TypeScript'],
      assignedManager: 'EMP005'
    }
  },
  {
    email: 'intern@enterprise.com',
    password: 'Intern@123',
    userData: {
      email: 'intern@enterprise.com',
      name: 'Sarah Intern',
      role: 'intern' as UserRole,
      department: 'System',
      areaCode: '001',
      areaName: 'MAHANADI COAL FIELD',
      createdAt: new Date(),
      isActive: true,
      phone: '+1-555-0107',
      employeeId: 'EMP007',
      qualification: 'Pursuing BS in Computer Science',
      certificateURL: 'https://example.com/certificates/intern.pdf',
      certificateVerified: true,
      assignedManager: 'EMP005'
    }
  },
  {
    email: 'apprentice@enterprise.com',
    password: 'Apprentice@123',
    userData: {
      email: 'apprentice@enterprise.com',
      name: 'Mike Apprentice',
      role: 'apprentice' as UserRole,
      department: 'Maintenance',
      areaCode: '001',
      areaName: 'MAHANADI COAL FIELD',
      createdAt: new Date(),
      isActive: true,
      phone: '+1-555-0108',
      employeeId: 'EMP008',
      qualification: 'Vocational Training in Design',
      certificateURL: 'https://example.com/certificates/apprentice.pdf',
      certificateVerified: true,
      assignedManager: 'EMP005'
    }
  }
];

// Demo departments — NEW STANDARD DEPARTMENTS (Area-scoped)
export const demoDepartments = [
  {
    id: 'dept-system',
    name: 'System',
    description: 'System administration and IT infrastructure',
    employeeCount: 0,
    projectCount: 0,
    areaCode: '001',
    areaName: 'MAHANADI COAL FIELD',
    teamLimit: 4,
    createdAt: new Date()
  },
  {
    id: 'dept-operations',
    name: 'Operations',
    description: 'Day-to-day operational management',
    employeeCount: 0,
    projectCount: 0,
    areaCode: '001',
    areaName: 'MAHANADI COAL FIELD',
    teamLimit: 3,
    createdAt: new Date()
  },
  {
    id: 'dept-project',
    name: 'Project',
    description: 'Project execution and delivery',
    employeeCount: 0,
    projectCount: 0,
    areaCode: '001',
    areaName: 'MAHANADI COAL FIELD',
    teamLimit: 3,
    createdAt: new Date()
  },
  {
    id: 'dept-support-hr',
    name: 'Support + HR',
    description: 'Human resources and employee support',
    employeeCount: 0,
    projectCount: 0,
    areaCode: '001',
    areaName: 'MAHANADI COAL FIELD',
    teamLimit: 2,
    createdAt: new Date()
  },
  {
    id: 'dept-finance-analytics',
    name: 'Finance + Analytics',
    description: 'Financial operations and data analytics',
    employeeCount: 0,
    projectCount: 0,
    areaCode: '001',
    areaName: 'MAHANADI COAL FIELD',
    teamLimit: 2,
    createdAt: new Date()
  },
  {
    id: 'dept-maintenance',
    name: 'Maintenance',
    description: 'Equipment and facility maintenance',
    employeeCount: 0,
    projectCount: 0,
    areaCode: '001',
    areaName: 'MAHANADI COAL FIELD',
    teamLimit: 2,
    createdAt: new Date()
  }
];

// Demo projects
export const demoProjects = [
  {
    id: 'proj-1',
    name: 'Enterprise Portal Redesign',
    description: 'Complete redesign of the internal enterprise portal',
    departmentId: 'dept-system',
    departmentName: 'System',
    assignedManagerId: 'EMP005',
    assignedManagerName: 'Project Manager',
    status: 'active',
    progress: 65,
    priority: 'high',
    startDate: new Date('2024-01-15'),
    deadline: new Date('2024-06-30'),
    createdAt: new Date()
  },
  {
    id: 'proj-2',
    name: 'HR Management System',
    description: 'Implementation of new HR management software',
    departmentId: 'dept-support-hr',
    departmentName: 'Support + HR',
    assignedManagerId: 'EMP002',
    assignedManagerName: 'HR Manager',
    status: 'active',
    progress: 40,
    priority: 'urgent',
    startDate: new Date('2024-02-01'),
    deadline: new Date('2024-05-15'),
    createdAt: new Date()
  },
  {
    id: 'proj-3',
    name: 'Mobile App Development',
    description: 'Customer-facing mobile application',
    departmentId: 'dept-project',
    departmentName: 'Project',
    assignedManagerId: 'EMP005',
    assignedManagerName: 'Project Manager',
    status: 'planning',
    progress: 15,
    priority: 'medium',
    startDate: new Date('2024-03-01'),
    deadline: new Date('2024-08-31'),
    createdAt: new Date()
  }
];

// Demo tasks
export const demoTasks = [
  {
    id: 'task-1',
    projectId: 'proj-1',
    projectName: 'Enterprise Portal Redesign',
    employeeId: 'EMP006',
    employeeName: 'John Employee',
    title: 'Frontend Development',
    description: 'Develop React components for the new portal',
    status: 'in_progress',
    priority: 'high',
    progress: 70,
    assignedBy: 'EMP005',
    assignedAt: new Date(),
    dueDate: new Date('2024-04-15'),
    createdAt: new Date()
  },
  {
    id: 'task-2',
    projectId: 'proj-1',
    projectName: 'Enterprise Portal Redesign',
    employeeId: 'EMP007',
    employeeName: 'Sarah Intern',
    title: 'UI Testing',
    description: 'Test UI components across different browsers',
    status: 'pending',
    priority: 'medium',
    progress: 0,
    assignedBy: 'EMP005',
    assignedAt: new Date(),
    dueDate: new Date('2024-04-20'),
    createdAt: new Date()
  }
];

// Demo notices
export const demoNotices = [
  {
    id: 'notice-1',
    title: 'Welcome to Enterprise Staffing System',
    message: 'We are excited to launch our new staffing and project tracking system. Please explore the features and update your profiles.',
    category: 'general',
    postedBy: 'EMP001',
    postedByName: 'System Administrator',
    createdAt: new Date(),
    isActive: true
  },
  {
    id: 'notice-2',
    title: 'Quarterly Review Meeting',
    message: 'All employees are required to attend the quarterly review meeting on March 15th at 10:00 AM in the main conference room.',
    category: 'urgent',
    postedBy: 'EMP003',
    postedByName: 'General Manager',
    createdAt: new Date(),
    isActive: true
  }
];
