// ============================================
// AI CHATBOT COMPONENT (Multi-Role + Persistent)
// Enterprise Assistant — Intelligent & Context-Aware
// ============================================

import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  X,
  Send,
  Bot,
  User,
  Loader2,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { 
  getTasksByEmployee, getProjectsByEmployee,
  saveChatMessage, getChatHistory, deleteChatMessage, clearChatHistory,
  getAllUsers, getAllProjects, getDashboardAnalytics
} from '@/services/firestoreService';
import type { Task, Project, UserRole } from '@/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  firestoreId?: string; // Firestore document ID for deletion
}

// ============================================
// ROLE-SPECIFIC CONFIGURATIONS
// ============================================

const ROLE_CONFIGS: Record<UserRole, {
  greeting: string;
  quickActions: Array<{ label: string; query: string }>;
}> = {
  admin: {
    greeting: `I'm your **Enterprise AI Assistant** in Admin mode.\n\nI can help you with:\n\n• 👥 User & Role Management (add, edit, bulk upload, approvals)\n• 🏢 Area & Department Management\n• 📊 System Analytics & Metrics\n• 📋 Notice Management\n• 🔐 Security & Access Control\n• 🛠️ Troubleshooting & Support\n\nWhat would you like to know?`,
    quickActions: [
      { label: '📊 System Stats', query: 'Show system analytics' },
      { label: '👥 User Count', query: 'How many users are there?' },
      { label: '📋 Pending Approvals', query: 'Any pending approvals?' },
      { label: '➕ Add Employee', query: 'How to add a new employee?' },
      { label: '📤 Bulk Upload', query: 'How to bulk upload users via CSV?' },
      { label: '❓ Help', query: 'What all can you help me with?' }
    ]
  },
  hr: {
    greeting: `I'm your **Enterprise AI Assistant** in HR mode.\n\nI can help you with:\n\n• 👥 Employee Verification & Onboarding\n• 📊 Workforce Analytics\n• ✅ Pending Approvals\n• 🧑‍💼 Employee / Intern / Apprentice Management\n• 📋 Reports & Data Queries\n\nWhat would you like to know?`,
    quickActions: [
      { label: '✅ Pending Approvals', query: 'Show pending user approvals' },
      { label: '👥 Employee Count', query: 'How many employees are there?' },
      { label: '📊 Department Stats', query: 'Show department breakdown' },
      { label: '🧑‍💼 Onboarding', query: 'How to onboard a new employee?' },
      { label: '❓ Help', query: 'What can you do?' }
    ]
  },
  general_manager: {
    greeting: `I'm your **Enterprise AI Assistant** in General Manager mode.\n\nI can help you with:\n\n• 📊 High-level Analytics & KPIs\n• 🏢 Department Performance\n• 📋 Project Monitoring\n• 👥 Workforce Overview\n• 📈 Strategic Insights\n\nWhat would you like to know?`,
    quickActions: [
      { label: '📊 Overview', query: 'Show overall analytics' },
      { label: '🏢 Departments', query: 'Department performance' },
      { label: '📋 Projects', query: 'Active project status' },
      { label: '👥 Workforce', query: 'Show workforce stats' },
      { label: '❓ Help', query: 'What can you help me with?' }
    ]
  },
  project_manager: {
    greeting: `I'm your **Enterprise AI Assistant** in Project Manager mode.\n\nI can help you with:\n\n• 📋 Project Progress Tracking\n• 👥 Team Status & Performance\n• ✅ Task Management\n• 📊 Work Submission Reviews\n• 📈 Performance Insights\n\nWhat would you like to know?`,
    quickActions: [
      { label: '📋 My Projects', query: 'Show my projects' },
      { label: '👥 Team Status', query: 'How is my team doing?' },
      { label: '✅ Pending Tasks', query: 'Show pending tasks' },
      { label: '📈 Progress', query: 'Overall project progress' },
      { label: '❓ Help', query: 'What can you help me with?' }
    ]
  },
  supervisor: {
    greeting: `I'm your **Enterprise AI Assistant** in Supervisor mode.\n\nI can help you with:\n\n• 👥 Team Member Status\n• 📋 Work Tracking & Assignment\n• ✅ Task Management\n• 📊 Team Performance Monitoring\n\nWhat would you like to know?`,
    quickActions: [
      { label: '👥 Team Status', query: 'Show team members status' },
      { label: '📋 Work Log', query: 'Recent work submissions' },
      { label: '✅ Tasks', query: 'Pending team tasks' },
      { label: '📈 Performance', query: 'Team performance overview' },
      { label: '❓ Help', query: 'What can you help me with?' }
    ]
  },
  employee: {
    greeting: `I'm your **Enterprise AI Assistant**.\n\nI can help you with:\n\n• ✅ Check your pending tasks\n• 📋 View your project information\n• 📝 Submit work reports & daily updates\n• 📊 Track your progress\n• 🛠️ Troubleshoot issues\n\nWhat would you like to know?`,
    quickActions: [
      { label: '✅ My Tasks', query: 'What are my pending tasks?' },
      { label: '📋 My Projects', query: 'Show my projects' },
      { label: '📝 Submit Report', query: 'How do I submit a report?' },
      { label: '📊 My Progress', query: 'Show my progress' },
      { label: '❓ Help', query: 'What all can you help me with?' }
    ]
  },
  intern: {
    greeting: `I'm your **Enterprise AI Assistant** — here to help you during your internship!\n\nI can help you with:\n\n• ✅ Check assigned tasks\n• 📊 Track your learning progress\n• 📝 Submit daily updates\n• 🛠️ Get guidance & support\n\nWhat would you like to know?`,
    quickActions: [
      { label: '✅ My Tasks', query: 'Show my tasks' },
      { label: '📊 Progress', query: 'Show my progress' },
      { label: '📝 Daily Update', query: 'How to submit daily update?' },
      { label: '🧭 Guide', query: 'How to use this system?' },
      { label: '❓ Help', query: 'What all can you help me with?' }
    ]
  },
  apprentice: {
    greeting: `I'm your **Enterprise AI Assistant** — here to help you during your apprenticeship!\n\nI can help you with:\n\n• ✅ Check assigned tasks\n• 📊 Track your learning progress\n• 📝 Submit daily updates\n• 🛠️ Get guidance & support\n\nWhat would you like to know?`,
    quickActions: [
      { label: '✅ My Tasks', query: 'Show my tasks' },
      { label: '📊 Progress', query: 'Show my progress' },
      { label: '📝 Daily Update', query: 'How to submit daily update?' },
      { label: '🧭 Guide', query: 'How to use this system?' },
      { label: '❓ Help', query: 'What all can you help me with?' }
    ]
  }
};

// ============================================
// INTELLIGENT KEYWORD MATCHING PATTERNS
// ============================================

/** Returns true if the message contains ANY of the given keywords */
const matchesAny = (msg: string, keywords: string[]): boolean =>
  keywords.some(k => msg.includes(k));

const AIChatbot = () => {
  const { userData } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const historyLoadedRef = useRef(false);

  const userRole = (userData?.role || 'employee') as UserRole;
  const roleConfig = ROLE_CONFIGS[userRole] || ROLE_CONFIGS.employee;

  // Load chat history from Firestore on first open
  const loadHistory = useCallback(async () => {
    if (!userData?.uid || historyLoadedRef.current) return;
    historyLoadedRef.current = true;
    setIsLoadingHistory(true);
    try {
      const history = await getChatHistory(userData.uid);
      if (history.length > 0) {
        setMessages(history.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp?.toDate?.() || new Date(),
          firestoreId: msg.id
        })));
      } else {
        // Show welcome message if no history
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: `Hello **${userData?.name || 'there'}**! 👋\n\n${roleConfig.greeting}`,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      // Fallback welcome message
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `Hello **${userData?.name || 'there'}**! 👋\n\n${roleConfig.greeting}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [userData, roleConfig.greeting]);

  useEffect(() => {
    if (isOpen && userData?.uid) {
      loadHistory();
      loadUserData();
    }
  }, [isOpen, userData, loadHistory]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-chatbot', handleOpen);
    return () => window.removeEventListener('open-chatbot', handleOpen);
  }, []);

  const loadUserData = async () => {
    if (!userData?.uid) return;
    try {
      const [tasksData, projectsData] = await Promise.all([
        getTasksByEmployee(userData.uid),
        getProjectsByEmployee(userData.uid)
      ]);
      setTasks(tasksData);
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ============================================
  // INTELLIGENT RESPONSE GENERATION ENGINE
  // ============================================
  const generateResponse = async (userMessage: string): Promise<string> => {
    const msg = userMessage.toLowerCase().trim();
    const name = userData?.name || 'there';

    // ================================================
    // 1. GREETINGS & CASUAL
    // ================================================
    if (/^(hi|hello|hey|namaste|namaskar|hii+|good\s*(morning|afternoon|evening|night)|howdy|sup|ssup)/i.test(msg)) {
      return `Hello **${name}**! 👋 How can I assist you today?\n\nYou can ask me about tasks, projects, reports, users, or any system-related query.`;
    }

    if (matchesAny(msg, ['thank', 'thanks', 'dhanyawad', 'shukriya', 'thnx', 'ty'])) {
      return `You're welcome, **${name}**! 😊 Glad I could help. Let me know if you need anything else!`;
    }

    if (matchesAny(msg, ['bye', 'goodbye', 'see you', 'cya', 'alvida'])) {
      return `Goodbye **${name}**! 👋 Have a great day. I'm always here when you need help!`;
    }

    if (matchesAny(msg, ['who are you', 'what are you', 'kon ho', 'kaun ho', 'introduce yourself', 'your name'])) {
      return `I'm the **Enterprise AI Assistant** 🤖 — your smart virtual helper integrated into the MCL Staffing & Workforce Management System.\n\nI can:\n✅ Answer system-related questions\n✅ Guide you based on your role (${userRole.replace('_', ' ')})\n✅ Show analytics & data\n✅ Troubleshoot common issues\n✅ Provide step-by-step instructions\n\nAsk me anything!`;
    }

    // ================================================
    // 2. SYSTEM ONBOARDING / GENERAL HELP
    // ================================================
    if (matchesAny(msg, ['what can you', 'help me', 'kya kar sakt', 'what all', 'capabilities', 'features', 'what do you do'])) {
      const base = `Here's everything I can help you with:\n\n`;
      const common = `**📋 Common for All Roles:**\n• Check tasks & project status\n• Submit daily work updates\n• View your progress & performance\n• Navigate the system\n• Troubleshoot login & access issues\n`;

      if (['admin'].includes(userRole)) {
        return base + common + `\n**🔐 Admin-Specific:**\n• User & role management (CRUD)\n• Bulk CSV/Excel user upload\n• Area & department management\n• System analytics & metrics\n• Approvals & verification status\n• Notice management\n• Security & access control\n`;
      }
      if (userRole === 'hr') {
        return base + common + `\n**🧑‍💼 HR-Specific:**\n• Employee verification & onboarding\n• Approve / reject pending users\n• Workforce analytics\n• Certificate verification\n• Employee data queries\n`;
      }
      if (['general_manager', 'project_manager'].includes(userRole)) {
        return base + common + `\n**📈 Manager-Specific:**\n• Department / project performance\n• Team status & assignment tracking\n• Analytics & KPI dashboards\n• Task creation & monitoring\n`;
      }
      if (userRole === 'supervisor') {
        return base + common + `\n**👷 Supervisor-Specific:**\n• Assign daily work to team\n• Track team progress\n• Monitor task completion\n• Review work submissions\n`;
      }
      return base + common + `\n💡 Just type your question in plain language and I'll guide you!`;
    }

    if (matchesAny(msg, ['how to use', 'system guide', 'kaise use', 'kaise chala', 'how does this work', 'getting started', 'onboarding', 'new here', 'guide me'])) {
      return `**🧭 System Quick Start Guide**\n\n**Step 1:** After login, you'll see your **Dashboard** with key stats and shortcuts.\n\n**Step 2:** Use the **sidebar** to navigate between modules:\n• Dashboard — Overview of your activity\n• Tasks — View and update assigned tasks\n• Projects — See your project details\n• Daily Updates — Submit daily work logs\n• Reports — Generate and view reports\n\n**Step 3:** Use **Quick Actions** on the Dashboard for fast access.\n\n**Step 4:** Click the 🤖 chat icon (me!) anytime for help.\n\n${['admin', 'hr'].includes(userRole) ? '**Step 5 (Admin/HR):** You also have access to User Management, Verifications, Departments, Notices, and Analytics from the sidebar.\n' : ''}\n❓ Need help with a specific module? Just ask!`;
    }

    // ================================================
    // 3. USER & ROLE MANAGEMENT (Admin/HR)
    // ================================================
    if (matchesAny(msg, ['add user', 'create user', 'register user', 'add employee', 'employee add', 'employee kaise', 'user kaise add', 'naya user', 'new user', 'user create', 'add intern', 'add apprentice'])) {
      if (['admin', 'hr'].includes(userRole)) {
        return `**➕ How to Add a New User:**\n\n1. Go to **Admin → User Management**\n2. Click the **"Register User"** button (teal button)\n3. Fill in the details:\n   • Full Name\n   • Email Address\n   • Password (min 8 chars, 1 letter, 1 number)\n   • Role (Employee / Intern / Apprentice)\n   • Area Code\n4. Click **"Register User"**\n\n✅ The user will be created with **pending** status\n⏳ HR needs to verify and approve before they can login\n\n💡 **For management roles** (Admin, HR, GM, PM, Supervisor), use the **"Add Role"** button instead.\n\n📤 Need to add many users? Use **"Bulk Upload"** for CSV/Excel import!`;
      }
      return `User registration is managed by **Admin** and **HR**.\n\nPlease contact your Admin or HR team to add new users to the system.\n\n📧 If you need access for someone, share their details with Admin.`;
    }

    if (matchesAny(msg, ['bulk upload', 'csv upload', 'excel upload', 'multiple user', 'bulk register', 'csv import', 'bahut saare user', 'bulk add', 'batch upload', 'mass register'])) {
      if (['admin'].includes(userRole)) {
        return `**📤 Bulk User Upload via CSV/Excel:**\n\n1. Go to **Admin → User Management**\n2. Click the purple **"Bulk Upload"** button\n3. You have two options:\n   • **Download Template** — Get a sample CSV with correct format\n   • **Drag & Drop** or click to upload your .csv or .xlsx file\n\n**CSV Format:**\n\`\`\`\nName,Email,Password,Role,AreaCode\nJohn Doe,john@example.com,SecurePass1,employee,001\n\`\`\`\n\n**Valid Roles:** admin, hr, general_manager, project_manager, supervisor, employee, intern, apprentice\n\n**Area Codes:** 001 through 038\n\n4. **Preview & Validate** — System checks each row for errors\n5. **Process** — Valid rows are registered automatically\n6. **Results** — See success/failure count with details\n\n⚠️ Duplicate emails will be rejected. Passwords must meet strength requirements.`;
      }
      return `Bulk upload is an **Admin-only** feature. Please contact your system administrator to bulk-register users via CSV/Excel.`;
    }

    if (matchesAny(msg, ['edit user', 'update user', 'change role', 'modify user', 'user edit', 'role change'])) {
      if (['admin'].includes(userRole)) {
        return `**✏️ How to Edit a User:**\n\n1. Go to **Admin → User Management**\n2. Find the user (use search or filters)\n3. Click the **⋯** (three dots) menu on the user's row\n4. Click **"Edit"**\n5. Update the Role, Department, or Area\n6. Click **"Save Changes"**\n\n💡 You can also **Activate/Deactivate** or **Delete** users from the same menu.`;
      }
      return `User editing is managed by **Admin**. Please contact your administrator for user modifications.`;
    }

    if (matchesAny(msg, ['delete user', 'remove user', 'user delete', 'hatao user'])) {
      if (['admin'].includes(userRole)) {
        return `**🗑️ How to Delete a User:**\n\n1. Go to **Admin → User Management**\n2. Find the user you want to remove\n3. Click the **⋯** menu → **"Delete"**\n4. Confirm the deletion\n\n⚠️ **Warning:** This action is irreversible! The user's Firestore document will be permanently removed.\n\n💡 **Tip:** Instead of deleting, consider **Deactivating** the user to preserve their data.`;
      }
      return `Only **Admin** can delete users. Contact your system administrator.`;
    }

    if (matchesAny(msg, ['assign role', 'give role', 'role assign', 'make admin', 'make hr', 'make supervisor', 'promote'])) {
      if (['admin'].includes(userRole)) {
        return `**🎭 How to Assign/Change Roles:**\n\n1. Go to **Admin → User Management**\n2. Find the user → Click **⋯** → **"Edit"**\n3. Change the **Role** dropdown to the desired role\n4. Click **"Save Changes"**\n\n**Available Roles:**\n• Admin — Full system control\n• HR — Employee management & verification\n• General Manager — Strategic oversight\n• Project Manager — Project & task management\n• Supervisor — Team oversight\n• Employee — Regular staff\n• Intern — Trainee\n• Apprentice — Skills learner`;
      }
      return `Role assignment is managed by **Admin**. Contact your administrator to change roles.`;
    }

    if (matchesAny(msg, ['permission', 'access control', 'role based', 'rbac', 'who can access', 'kya access'])) {
      return `**🔐 Role-Based Access Control (RBAC):**\n\n| Role | Access Level |\n|------|-------------|\n| **Admin** | Full system access — users, roles, areas, analytics, notices |\n| **HR** | Employee verification, onboarding, workforce management |\n| **GM** | Department overview, project monitoring, analytics |\n| **PM** | Project management, task assignment, team tracking |\n| **Supervisor** | Team oversight, work assignment, daily tracking |\n| **Employee** | Own tasks, projects, daily updates, reports |\n| **Intern/Apprentice** | Own tasks, learning progress, daily updates |\n\nEach role can only see pages and data relevant to their access level.`;
    }

    // ================================================
    // 4. AREA MANAGEMENT
    // ================================================
    if (matchesAny(msg, ['area', 'assign area', 'change area', 'area management', 'location', 'area code'])) {
      if (['admin'].includes(userRole)) {
        return `**🏢 Area Management:**\n\nThe system supports **38 areas** (001-038) mapped to MCL locations.\n\n**To assign/change a user's area:**\n1. Go to **Admin → User Management**\n2. Find the user → Click **⋯** → **"Edit"**\n3. Change the **Area** dropdown\n4. Click **"Save Changes"**\n\n**To filter users by area:**\n• Use the **Area filter** dropdown on the User Management page\n\n**Area Codes:** 001 (Mahanadi Coal Field) through 038 (MCL Lakhanpur BOCM)\n\n💡 Areas are also assigned during user registration and bulk upload.`;
      }
      return `Areas are managed by **Admin**. Your current area is: **${userData?.areaCode || 'Not assigned'}** (${userData?.areaName || 'N/A'})\n\nContact your administrator to change area assignments.`;
    }

    // ================================================
    // 5. ANALYTICS & SYSTEM STATS (Admin/HR/GM)
    // ================================================
    if (matchesAny(msg, ['analytics', 'stats', 'statistics', 'overview', 'dashboard', 'metrics', 'kitne log', 'total'])) {
      if (['admin', 'general_manager', 'hr'].includes(userRole)) {
        try {
          const analytics = await getDashboardAnalytics();
          return `**📊 System Analytics Dashboard:**\n\n👥 **Workforce:**\n• Total Employees: **${analytics.totalEmployees}**\n• Departments: **${analytics.totalDepartments}**\n\n📋 **Projects:**\n• Total Projects: **${analytics.totalProjects}**\n• Active: **${analytics.activeProjects}**\n• Completed: **${analytics.completedProjects}**\n\n✅ **Tasks:**\n• Pending: **${analytics.pendingTasks}**\n• Completed: **${analytics.completedTasks}**\n\n💡 For detailed analytics, visit **Admin → Analytics** page.`;
        } catch {
          return 'Unable to load analytics at this time. Please try again later or visit the **Analytics** page directly.';
        }
      }
      return `For system-wide analytics, please contact your **Admin** or **GM**.\n\nYou can view your personal stats on your **Dashboard** page.`;
    }

    if (matchesAny(msg, ['user count', 'how many user', 'kitne user', 'total user', 'user kitne', 'employee count', 'kitne employee'])) {
      if (['admin', 'hr', 'general_manager'].includes(userRole)) {
        try {
          const users = await getAllUsers();
          const byRole = users.reduce((acc: Record<string, number>, u) => {
            acc[u.role] = (acc[u.role] || 0) + 1;
            return acc;
          }, {});
          const active = users.filter(u => u.isActive).length;
          const pending = users.filter(u => u.approvalStatus === 'pending' || (!u.approvalStatus && u.isApproved === false)).length;
          let response = `**👥 User Statistics:**\n\n• **Total Users:** ${users.length}\n• **Active:** ${active}\n• **Pending Approval:** ${pending}\n\n**By Role:**\n`;
          Object.entries(byRole).sort((a, b) => b[1] - a[1]).forEach(([role, count]) => {
            response += `• ${role.replace('_', ' ')}: **${count}**\n`;
          });
          return response;
        } catch {
          return 'Unable to load user data at this time.';
        }
      }
      return `User count information is available to **Admin**, **HR**, and **GM** roles. Contact them for this data.`;
    }

    if (matchesAny(msg, ['pending approval', 'pending verification', 'who is pending', 'approval status', 'waiting approval', 'pending user'])) {
      if (['admin', 'hr'].includes(userRole)) {
        try {
          const users = await getAllUsers();
          const pending = users.filter(u => 
            u.approvalStatus === 'pending' || (!u.approvalStatus && u.isApproved === false)
          );
          if (pending.length === 0) return '✅ No pending approvals! All users have been reviewed.';
          let response = `**⏳ ${pending.length} Pending Approval(s):**\n\n`;
          pending.slice(0, 10).forEach((u, i) => {
            response += `${i + 1}. **${u.name}** — ${u.email} (${u.role.replace('_', ' ')})\n`;
          });
          if (pending.length > 10) response += `\n...and ${pending.length - 10} more`;
          response += `\n\n📍 Go to **${userRole === 'admin' ? 'Admin' : 'HR'} → Verifications** to approve or reject.`;
          return response;
        } catch {
          return 'Unable to check pending approvals at this time.';
        }
      }
      return `Approval management is handled by **Admin** and **HR**.\n\nIf your account is pending, please wait for HR verification or contact them directly.`;
    }

    // ================================================
    // 6. EMPLOYEE / INTERN / APPRENTICE MANAGEMENT
    // ================================================
    if (matchesAny(msg, ['onboard', 'new employee', 'new hire', 'naya bharti', 'joining process'])) {
      if (['admin', 'hr'].includes(userRole)) {
        return `**🧑‍💼 Employee Onboarding Process:**\n\n**Step 1 — Registration:**\n• Admin registers the employee via **User Management → Register User**\n• Or use **Bulk Upload** for multiple employees\n\n**Step 2 — Verification:**\n• HR reviews the registration at **HR → Verifications**\n• Verify documents, certificates (for interns/apprentices)\n• Click **Approve** or **Reject**\n\n**Step 3 — Activation:**\n• Once approved, the employee can login\n• Admin can assign area, department, role\n\n**Step 4 — Assignment:**\n• PM/Supervisor assigns projects and tasks\n• Employee starts submitting daily updates\n\n💡 For interns/apprentices, ensure certificate upload during registration.`;
      }
      return `The onboarding process is managed by **Admin** and **HR**.\n\nAs a new employee, your steps are:\n1. Wait for HR verification ✅\n2. Login with your credentials\n3. Check your Dashboard for assigned tasks\n4. Start submitting daily work updates`;
    }

    if (matchesAny(msg, ['duplicate', 'already exist', 'pehle se hai', 'duplicate email', 'duplicate user', 'email conflict'])) {
      return `**⚠️ Duplicate User Issue:**\n\nThe system prevents duplicate email registrations.\n\n**If you see "Email already exists":**\n1. The email is already registered in the system\n2. Search for the email in **User Management**\n3. If it's an inactive user, you can **reactivate** them\n4. If it's a mistake, **delete** the old entry first\n\n**During Bulk Upload:**\n• Duplicate emails within the CSV are flagged\n• Emails already in the system are rejected\n• Only unique, new emails are processed\n\n💡 Contact Admin if you need help resolving duplicates.`;
    }

    if (matchesAny(msg, ['wrong role', 'incorrect role', 'galat role', 'role wrong'])) {
      if (['admin'].includes(userRole)) {
        return `**🔄 Fix Incorrect Role Assignment:**\n\n1. Go to **Admin → User Management**\n2. Search for the user\n3. Click **⋯** → **"Edit"**\n4. Change the **Role** to the correct one\n5. Click **"Save Changes"**\n\nThe change takes effect immediately. The user may need to re-login to see updated permissions.`;
      }
      return `If your role is incorrect, please contact your **Admin** to update it.\n\nProvide your correct role details and the Admin can fix it from User Management.`;
    }

    // ================================================
    // 7. TASK & WORK MANAGEMENT
    // ================================================
    if (matchesAny(msg, ['assign task', 'create task', 'task assign', 'task create', 'task kaise de', 'kaam assign'])) {
      if (['project_manager', 'supervisor', 'admin'].includes(userRole)) {
        return `**✅ How to Assign a Task:**\n\n1. Go to your **Dashboard** or **Projects** page\n2. Select the project\n3. Click **"Add Task"** or **"Assign Task"**\n4. Fill in:\n   • Task Title & Description\n   • Assign to Employee\n   • Priority (Low / Medium / High / Urgent)\n   • Due Date\n5. Click **"Create Task"**\n\n✅ The employee will see the task on their dashboard\n📩 They'll receive a notification about the new assignment`;
      }
      return `Task assignment is managed by **Project Managers** and **Supervisors**.\n\nIf you need a task assigned, speak with your PM or Supervisor.`;
    }

    if (matchesAny(msg, ['task not visible', 'task nahi dikh', 'can\'t see task', 'task missing', 'task show nahi', 'task dikhai nahi'])) {
      return `**🔍 Task Not Visible? Here's What to Check:**\n\n1. **Correct Role** — Ensure you have the right role assigned\n2. **Assignment** — The task must be assigned to YOU specifically\n3. **Project Membership** — You must be a member of the project\n4. **Area** — Check if you're in the correct area\n5. **Status Filter** — Check if filters are hiding the task (e.g., showing only "completed")\n6. **Refresh** — Try refreshing the page (Ctrl+R)\n\n**Still not visible?**\n• Ask your PM/Supervisor to verify the assignment\n• Contact Admin if the issue persists\n\n💡 Tasks appear on your Dashboard → Tasks section.`;
    }

    if (matchesAny(msg, ['update task', 'task status', 'task progress', 'mark complete', 'task complete', 'task update'])) {
      return `**📋 How to Update Task Status:**\n\n1. Go to your **Dashboard** → **Tasks**\n2. Find the task you want to update\n3. Click on the task to open details\n4. Update:\n   • **Status** (Pending → In Progress → Review → Completed)\n   • **Progress** percentage\n   • Add comments if needed\n5. Save changes\n\n💡 Your PM/Supervisor will be notified of status changes.`;
    }

    // General task queries
    if (matchesAny(msg, ['task', 'kaam', 'work', 'my task', 'pending task', 'mera kaam'])) {
      const pendingTasks = tasks.filter(t => t.status === 'pending');
      const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
      const completedTasks = tasks.filter(t => t.status === 'completed');
      
      if (pendingTasks.length === 0 && inProgressTasks.length === 0) {
        return `You don't have any pending tasks at the moment. Great job staying on top of your work! 🎉\n\n${completedTasks.length > 0 ? `📊 You've completed **${completedTasks.length}** task(s) so far.` : ''}\n\n💡 Check your Dashboard for any new assignments.`;
      }
      
      let response = `**Your Tasks Overview:**\n\n`;
      response += `• **${pendingTasks.length}** pending\n• **${inProgressTasks.length}** in-progress\n• **${completedTasks.length}** completed\n\n`;
      
      if (pendingTasks.length > 0) {
        response += "**⏳ Pending:**\n";
        pendingTasks.slice(0, 5).forEach((task, i) => {
          response += `${i + 1}. ${task.title} _(${task.priority} priority)_\n`;
        });
      }
      
      if (inProgressTasks.length > 0) {
        response += "\n**🔄 In Progress:**\n";
        inProgressTasks.slice(0, 5).forEach((task, i) => {
          response += `${i + 1}. ${task.title} — ${task.progress}% done\n`;
        });
      }
      
      return response;
    }
    
    // ================================================
    // 8. PROJECT QUERIES
    // ================================================
    if (matchesAny(msg, ['project', 'projects', 'my project', 'active project', 'project status', 'mera project'])) {
      // Admin/GM: show all projects
      if (['admin', 'general_manager'].includes(userRole)) {
        try {
          const allP = await getAllProjects();
          const active = allP.filter(p => p.status === 'active');
          const completed = allP.filter(p => p.status === 'completed');
          let response = `**📋 Project Overview:**\n\n• Total: **${allP.length}**\n• Active: **${active.length}**\n• Completed: **${completed.length}**\n\n`;
          if (active.length > 0) {
            response += '**Active Projects:**\n';
            active.slice(0, 7).forEach((p, i) => {
              response += `${i + 1}. **${p.name}** — ${p.progress}% _(${p.priority})_\n`;
            });
          }
          if (active.length > 7) response += `\n...and ${active.length - 7} more active projects`;
          return response;
        } catch {
          return 'Unable to load project data. Please try again or visit the **Projects** page.';
        }
      }

      // PM/Supervisor: show their projects
      if (['project_manager', 'supervisor'].includes(userRole)) {
        try {
          const allProjects = await getAllProjects();
          const myProjects = allProjects.filter(p => p.assignedManagerId === userData?.uid);
          if (myProjects.length === 0) return "You don't have any assigned projects yet.\n\nContact your Admin to get projects assigned.";
          let response = `**📋 Your Projects (${myProjects.length}):**\n\n`;
          myProjects.forEach((p, i) => {
            const statusEmoji = p.status === 'active' ? '🟢' : p.status === 'completed' ? '✅' : p.status === 'on_hold' ? '⏸️' : '📋';
            response += `${i + 1}. ${statusEmoji} **${p.name}** — ${p.progress}% complete _(${p.status})_\n`;
          });
          return response;
        } catch {
          return 'Unable to load project data at this time.';
        }
      }

      // Employee/Intern: show assigned projects
      if (projects.length === 0) {
        return "You don't have any assigned projects currently.\n\nYour PM or Supervisor will assign you to projects when needed. Check back later! 📋";
      }
      let response = `**📋 Your Projects (${projects.length}):**\n\n`;
      projects.forEach((project, i) => {
        response += `${i + 1}. **${project.name}** — ${project.progress}% complete _(${project.status})_\n`;
      });
      return response;
    }

    // ================================================
    // 9. REPORTS & DAILY UPDATES
    // ================================================
    if (matchesAny(msg, ['report', 'submit report', 'daily update', 'work submit', 'kaam bhejo', 'report kaise', 'daily work', 'submit work'])) {
      if (userRole === 'intern' || userRole === 'apprentice') {
        return `**📝 How to Submit Your Daily Update:**\n\n1. Go to your **Dashboard**\n2. Click **"Daily Updates"** in the sidebar\n3. Fill in the form:\n   • Select the **date**\n   • Project & Task (if applicable)\n   • **Hours worked**\n   • **Description** of what you did\n   • **Accomplishments**\n   • Challenges faced (optional)\n   • Tomorrow's plan (optional)\n4. Click **"Submit"**\n\n✅ Your supervisor will review your updates!\n\n💡 **Tip:** Submit daily — consistency shows professionalism!`;
      }
      return `**📝 How to Submit Work / Report:**\n\n1. Go to your **Dashboard**\n2. Click **"Submit Work"** or **"Daily Updates"** in the sidebar\n3. Fill in your work details:\n   • Date & Hours worked\n   • Description & Accomplishments\n   • Select Project/Task\n4. Click **"Submit"**\n\n📩 Your supervisor/PM will be notified automatically!\n\n💡 **Generating Reports?**\n• Go to **Reports** section\n• Select report type (Daily / Weekly / Monthly)\n• Choose date range\n• Click **Generate** or **Export**`;
    }

    if (matchesAny(msg, ['download report', 'export report', 'report download', 'report export', 'data download'])) {
      return `**📥 How to Download/Export Reports:**\n\n1. Go to the relevant page (Users, Analytics, etc.)\n2. Look for the **"Export"** or **"Download"** button\n3. Click it to download as CSV\n\n**User Export (Admin):**\n• Go to **Admin → User Management**\n• Click **"Export"** button\n• Downloads all user data as CSV\n\n**Report Not Showing Data?**\n• Check date range filters\n• Ensure data exists for the selected period\n• Try clearing filters and searching again`;
    }

    if (matchesAny(msg, ['report empty', 'no data', 'data nahi', 'report blank', 'kuch nahi dikh'])) {
      return `**📋 Report Showing Empty? Here's What to Check:**\n\n1. **Date Range** — Ensure the date range has data\n2. **Filters** — Clear all filters and try again\n3. **Role Access** — You may not have permission for certain data\n4. **Data Exists** — Confirm that work has been submitted for the period\n5. **Refresh** — Hard refresh the page (Ctrl+Shift+R)\n\n**Still empty?**\n• Ask your team if they've submitted their updates\n• Contact Admin to verify data availability`;
    }

    // ================================================
    // 10. PROGRESS & PERFORMANCE
    // ================================================
    if (matchesAny(msg, ['progress', 'performance', 'how am i doing', 'mera progress', 'my performance', 'kitna kaam'])) {
      const completedCount = tasks.filter(t => t.status === 'completed').length;
      const totalTasks = tasks.length;
      const progress = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
      
      let emoji = '💪';
      let feedback = 'Keep pushing! You\'ve got this!';
      if (progress >= 90) { emoji = '🏆'; feedback = 'Outstanding performance! You\'re a star!'; }
      else if (progress >= 70) { emoji = '🎉'; feedback = 'Excellent work! Keep it up!'; }
      else if (progress >= 50) { emoji = '👍'; feedback = 'Good progress! You\'re on the right track!'; }
      else if (progress >= 30) { emoji = '📈'; feedback = 'Making progress! Keep building momentum!'; }

      return `**📊 Your Performance Summary:**\n\n• Tasks Completed: **${completedCount}** / **${totalTasks}**\n• Overall Progress: **${progress}%** ${emoji}\n• Active Projects: **${projects.length}**\n\n${feedback}\n\n💡 Pro tips:\n• Update your task progress daily\n• Submit work reports on time\n• Communicate challenges early`;
    }

    // ================================================
    // 11. DEPARTMENT MANAGEMENT
    // ================================================
    if (matchesAny(msg, ['department', 'dept', 'department stats', 'vibhag'])) {
      if (['admin', 'general_manager', 'hr'].includes(userRole)) {
        return `**🏢 Department Management:**\n\n**To View/Manage Departments:**\n1. Go to **Admin → Departments**\n2. See all departments with employee counts\n3. Click **"Add Department"** to create new ones\n4. Edit or delete existing departments\n\n**Department Features:**\n• Assign Department Head\n• View employee count per department\n• Track project count per department\n• Filter users by department\n\n💡 Use the User Management page to assign employees to departments.`;
      }
      return `Your department: **${userData?.department || 'Not assigned'}**\n\nDepartment management is handled by **Admin**. Contact them for changes.`;
    }

    // ================================================
    // 12. NOTICE MANAGEMENT
    // ================================================
    if (matchesAny(msg, ['notice', 'announcement', 'notification', 'suchna', 'ghoshna'])) {
      if (['admin'].includes(userRole)) {
        return `**📢 Notice Management (Admin):**\n\n**To Create a Notice:**\n1. Go to **Admin → Notices**\n2. Click **"Create Notice"**\n3. Fill in:\n   • Title & Message\n   • Category (General / Urgent / Policy / Event)\n   • Type (Global / Team / Individual)\n   • Target (if Team or Individual)\n4. Click **"Post Notice"**\n\n**Notice Types:**\n• **Global** — Visible to all users\n• **Team** — Visible to specific team/department\n• **Individual** — Visible to specific user\n\n💡 Urgent notices are highlighted with special styling.`;
      }
      return `Notices and announcements appear on your **Dashboard**.\n\nCheck the **Notices** section in the sidebar to see all current notices.\n\nIf you can't see a specific notice, it may be targeted to a specific team/role.`;
    }

    // ================================================
    // 13. AUTHENTICATION & LOGIN ISSUES
    // ================================================
    if (matchesAny(msg, ['login', 'can\'t login', 'login nahi', 'nahi ho raha login', 'sign in', 'access denied', 'not working', 'unable to login'])) {
      return `**🔐 Login Troubleshooting:**\n\n**Step 1:** Check your credentials:\n• Email must be in **lowercase**\n• Password is **case-sensitive**\n• Ensure no extra spaces\n\n**Step 2:** Common error messages:\n• **"Account not verified"** → Your account is pending HR/Admin approval\n• **"Account rejected"** → Contact Admin\n• **"Wrong credentials"** → Double-check email and password\n• **"User not found"** → Account may not be registered yet\n\n**Step 3:** Try these fixes:\n• Clear browser cache (Ctrl+Shift+Delete)\n• Try a different browser\n• Use incognito/private mode\n• Check if you're using the correct URL\n\n**Step 4:** If nothing works:\n• Contact your **Admin** or **HR** team\n• Ask them to verify your account status\n• They can reset your password if needed\n\n💡 Google Sign-In is also available as an alternative.`;
    }

    if (matchesAny(msg, ['password reset', 'forgot password', 'change password', 'password bhul', 'reset password', 'password change'])) {
      return `**🔑 Password Reset / Change:**\n\n**If you forgot your password:**\n1. Contact your **Admin**\n2. They can help reset your account\n3. Or use **Google Sign-In** if enabled\n\n**To change your password (if logged in):**\n1. Go to your **Profile** settings\n2. Look for **"Change Password"** option\n3. Enter your new password\n4. Requirements: Min 8 chars, 1 letter, 1 number\n\n⚠️ Avoid weak passwords like "password123" or "12345678"`;
    }

    if (matchesAny(msg, ['access denied', 'permission denied', 'not authorized', 'unauthorized', 'nahi dikh raha'])) {
      return `**🚫 Access Denied? Here's What to Check:**\n\n1. **Role** — Your role may not have access to that page\n   • Check your role in your profile\n   • Contact Admin to verify role assignment\n\n2. **Approval Status** — Your account may be pending\n   • New accounts need HR/Admin approval\n   • Check with HR for approval status\n\n3. **Active Status** — Your account may be deactivated\n   • Contact Admin to reactivate\n\n4. **Area Restriction** — Some content is area-specific\n   • Verify your area assignment\n\n💡 If you believe this is an error, contact your **Admin** with details about what you're trying to access.`;
    }

    // ================================================
    // 14. TEAM MANAGEMENT (PM/Supervisor)
    // ================================================
    if (matchesAny(msg, ['team', 'team status', 'team member', 'meri team', 'my team', 'team performance'])) {
      if (['project_manager', 'supervisor'].includes(userRole)) {
        try {
          const allProjects = await getAllProjects();
          const myProjects = allProjects.filter(p => p.assignedManagerId === userData?.uid);
          if (myProjects.length === 0) return "You don't have any assigned projects/teams yet.";
          let response = `**👥 Your Team & Projects:**\n\n`;
          myProjects.forEach((p, i) => {
            const members = p.teamMembers?.length || 0;
            response += `${i + 1}. **${p.name}**\n   • Members: ${members}\n   • Progress: ${p.progress}%\n   • Status: ${p.status}\n\n`;
          });
          response += `💡 Go to **Projects** page for detailed team management.`;
          return response;
        } catch {
          return 'Unable to load team data at this time.';
        }
      }
      return `Team management is handled by **PMs** and **Supervisors**.\n\nTo see your teammates, check your **Project** details on the Dashboard.`;
    }

    // ================================================
    // 15. NAVIGATION HELP
    // ================================================
    if (matchesAny(msg, ['where is', 'kahan hai', 'how to go', 'navigate', 'find', 'page kahan'])) {
      return `**🧭 Navigation Guide:**\n\nUse the **sidebar** (left panel) to navigate:\n\n**Common Pages:**\n• 🏠 Dashboard — Home page with overview\n• ✅ Tasks — Your assigned tasks\n• 📋 Projects — Your projects\n• 📝 Daily Updates — Submit work logs\n\n${['admin'].includes(userRole) ? '**Admin Pages:**\n• 👥 User Management — Add/edit/delete users\n• 🏢 Departments — Manage departments\n• 📢 Notices — Post announcements\n• 📊 Analytics — System metrics\n• ✅ Verifications — Approve users\n' : ''}${['hr'].includes(userRole) ? '**HR Pages:**\n• 👥 Employees — Employee management\n• ✅ Verifications — Approve/reject users\n• 📊 Reports — Workforce reports\n' : ''}\nOn **mobile**, tap the ☰ menu icon to open the sidebar.\n\n💡 Can't find something specific? Tell me what you're looking for!`;
    }

    // ================================================
    // 16. TECHNICAL / TROUBLESHOOTING
    // ================================================
    if (matchesAny(msg, ['error', 'bug', 'crash', 'not working', 'problem', 'issue', 'dikkat', 'pareshani', 'slow', 'loading'])) {
      return `**🛠️ Troubleshooting Guide:**\n\n**Quick Fixes:**\n1. **Refresh the page** (Ctrl+R or Cmd+R)\n2. **Hard refresh** (Ctrl+Shift+R) to clear cache\n3. **Clear browser data** (Ctrl+Shift+Delete)\n4. **Try incognito/private mode**\n5. **Check internet connection**\n\n**If the problem persists:**\n• Note the **exact error message**\n• Note **which page** the error occurs on\n• Note **what action** triggered the error\n• Take a **screenshot** if possible\n\n**Escalation:**\n• Contact your **Admin** with the above details\n• Admin can check system logs and resolve technical issues\n\n💡 **Common Issues:**\n• Blank page → Hard refresh + clear cache\n• Slow loading → Check internet speed\n• Data not showing → Refresh or check filters\n• Access denied → Verify role and permissions`;
    }

    // ================================================
    // 17. MOBILE-SPECIFIC
    // ================================================
    if (matchesAny(msg, ['mobile', 'phone', 'responsive', 'mobile pe', 'phone pe'])) {
      return `**📱 Mobile Usage Guide:**\n\nThe system is fully mobile-responsive! Here are some tips:\n\n1. **Sidebar** — Tap the ☰ menu icon (top-left) to open navigation\n2. **Tables** — Scroll horizontally to see all columns, or use card view on mobile\n3. **Dialogs** — Scroll within dialogs if content is long\n4. **Notifications** — Drop down from the bell icon\n\n**Mobile Issues?**\n• Clear browser cache\n• Update your browser to latest version\n• Try adding to home screen for app-like experience\n• Ensure you're using the latest deployed version`;
    }

    // ================================================
    // 18. ESCALATION & CONTACT
    // ================================================
    if (matchesAny(msg, ['contact', 'support', 'sampark', 'reach', 'it support', 'escalate', 'admin se baat'])) {
      return `**📞 Need Further Help?**\n\nIf I couldn't resolve your issue, here's how to escalate:\n\n1. **Contact Admin** — For system access, user management, and technical issues\n2. **Contact HR** — For employee verification, onboarding, and HR-related queries\n3. **Contact Your Supervisor** — For task assignments and daily work queries\n4. **Contact PM** — For project-related issues\n\n💡 When reaching out, include:\n• Your **name** and **email**\n• **Description** of the issue\n• **Screenshot** if applicable\n• **Steps** you've already tried`;
    }

    // ================================================
    // 19. HINDI / HINGLISH SUPPORT
    // ================================================
    if (matchesAny(msg, ['kaise kare', 'kya karu', 'batao', 'samjhao', 'bta do', 'help karo', 'kaise hoga'])) {
      return `Main aapki madad ke liye haazir hoon! 🤖\n\nAap mujhse ye pooch sakte hain:\n\n• **"Task kaise dekhein?"** — Apne tasks ki jaankari\n• **"Report kaise submit karein?"** — Daily work submit karna\n• **"User kaise add karein?"** — Naya user register karna (Admin)\n• **"Login nahi ho raha"** — Login samasyaye\n• **"Project status batao"** — Project ki jaankari\n\n💡 Aap Hindi, English ya Hinglish mein pooch sakte hain!`;
    }

    // ================================================
    // 20. CERTIFICATE / VERIFICATION
    // ================================================
    if (matchesAny(msg, ['certificate', 'verify', 'verification', 'praman patra', 'document'])) {
      if (['admin', 'hr'].includes(userRole)) {
        return `**📄 Certificate Verification (HR/Admin):**\n\n1. Go to **Verifications** page\n2. Find the pending user (intern/apprentice with certificate)\n3. Click to view their **certificate/bona-fide**\n4. Verify the document authenticity\n5. Click **"Approve"** or **"Reject"**\n\n⚠️ Ensure certificates are:\n• Valid and not expired\n• From a recognized institution\n• Matching the user's claimed qualification`;
      }
      return `Certificate verification is handled by **HR**.\n\nIf you uploaded a certificate during registration, HR will verify it as part of the approval process.\n\n⏳ Please wait for HR review, or contact them for status updates.`;
    }

    // ================================================
    // FALLBACK — Intelligent Default
    // ================================================
    return `I'm not sure I fully understood your query: **"${userMessage}"**\n\nHere are some things you can ask me:\n\n• **Tasks** — "Show my pending tasks"\n• **Projects** — "What are my projects?"\n• **Reports** — "How to submit a report?"\n• **Users** — "How to add a new employee?" _(Admin)_\n• **Login Issues** — "I can't login"\n• **Navigation** — "How to use this system?"\n• **Analytics** — "Show system stats" _(Admin/HR/GM)_\n\n💡 Try rephrasing your question or use the **quick action** buttons below!`;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const messageText = input.trim();
    setInput('');
    setIsLoading(true);

    // Save user message to Firestore
    if (userData?.uid) {
      try {
        const fId = await saveChatMessage(userData.uid, userRole, { role: 'user', content: messageText });
        setMessages(prev => prev.map(m => m.id === userMessage.id ? { ...m, firestoreId: fId } : m));
      } catch (err) {
        console.error('Failed to save user message:', err);
      }
    }

    // Generate response
    try {
      const response = await generateResponse(messageText);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Save assistant message to Firestore
      if (userData?.uid) {
        try {
          const fId = await saveChatMessage(userData.uid, userRole, { role: 'assistant', content: response });
          setMessages(prev => prev.map(m => m.id === assistantMessage.id ? { ...m, firestoreId: fId } : m));
        } catch (err) {
          console.error('Failed to save assistant message:', err);
        }
      }
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDeleteMessage = async (msg: Message) => {
    if (msg.firestoreId) {
      try {
        await deleteChatMessage(msg.firestoreId);
      } catch (err) {
        console.error('Failed to delete message:', err);
      }
    }
    setMessages(prev => prev.filter(m => m.id !== msg.id));
  };

  const handleClearAll = async () => {
    if (!userData?.uid) return;
    try {
      await clearChatHistory(userData.uid);
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `Chat cleared! 🧹\n\n${roleConfig.greeting}`,
        timestamp: new Date()
      }]);
    } catch (err) {
      console.error('Failed to clear chat:', err);
    }
  };

  // ============================================
  // SIMPLE MARKDOWN RENDERER
  // ============================================
  const renderMarkdown = (text: string) => {
    // Split by lines and process each
    const parts: React.ReactNode[] = [];
    const lines = text.split('\n');
    
    lines.forEach((line, lineIdx) => {
      // Process inline formatting within a line
      const processInline = (str: string): React.ReactNode[] => {
        const nodes: React.ReactNode[] = [];
        // Match **bold**, *italic*, `code`, and _italic_
        const regex = /(\*\*(.+?)\*\*|`(.+?)`|_(.+?)_)/g;
        let lastIndex = 0;
        let match;
        let key = 0;

        while ((match = regex.exec(str)) !== null) {
          // Text before match
          if (match.index > lastIndex) {
            nodes.push(str.slice(lastIndex, match.index));
          }

          if (match[2]) {
            // **bold**
            nodes.push(<strong key={key++} className="font-semibold">{match[2]}</strong>);
          } else if (match[3]) {
            // `code`
            nodes.push(
              <code key={key++} className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs font-mono">
                {match[3]}
              </code>
            );
          } else if (match[4]) {
            // _italic_
            nodes.push(<em key={key++}>{match[4]}</em>);
          }

          lastIndex = match.index + match[0].length;
        }

        // Remaining text
        if (lastIndex < str.length) {
          nodes.push(str.slice(lastIndex));
        }

        return nodes.length > 0 ? nodes : [str];
      };

      if (lineIdx > 0) {
        parts.push(<br key={`br-${lineIdx}`} />);
      }

      // Table row
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        // Skip separator rows like |---|---|
        if (/^\|[\s-|]+\|$/.test(line.trim())) return;
        const cells = line.trim().split('|').filter(c => c.trim() !== '');
        parts.push(
          <div key={`table-${lineIdx}`} className="flex gap-2 text-xs py-0.5">
            {cells.map((cell, ci) => (
              <span key={ci} className={`${ci === 0 ? 'font-semibold min-w-[80px]' : 'flex-1 opacity-80'}`}>
                {processInline(cell.trim())}
              </span>
            ))}
          </div>
        );
        return;
      }

      // Bullet points
      if (line.trim().startsWith('• ') || line.trim().startsWith('- ')) {
        const indent = line.startsWith('   ') ? 'ml-4' : '';
        parts.push(
          <span key={`li-${lineIdx}`} className={`block ${indent}`}>
            {processInline(line.trim())}
          </span>
        );
        return;
      }

      // Numbered list
      if (/^\d+\.\s/.test(line.trim())) {
        const indent = line.startsWith('   ') ? 'ml-4' : '';
        parts.push(
          <span key={`ol-${lineIdx}`} className={`block ${indent}`}>
            {processInline(line.trim())}
          </span>
        );
        return;
      }

      parts.push(<span key={`line-${lineIdx}`}>{processInline(line)}</span>);
    });

    return parts;
  };

  return (
    <>
      {/* Chat Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 p-3 sm:p-4 rounded-full bg-gradient-to-r from-teal-600 to-teal-700 text-white shadow-lg hover:shadow-xl transition-shadow ${
          isOpen ? 'hidden' : 'flex'
        }`}
      >
        <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
        <span className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-red-500 rounded-full animate-pulse" />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-50 sm:w-96 sm:max-w-[calc(100vw-3rem)] sm:max-h-[70vh] bg-white dark:bg-gray-900 sm:rounded-2xl shadow-2xl border-0 sm:border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-teal-600 to-teal-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Enterprise AI Assistant</h3>
                  <p className="text-xs text-teal-100 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full" />
                    {userRole.replace('_', ' ')} mode
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleClearAll}
                  className="p-2 rounded-lg hover:bg-white/20 text-white transition-colors"
                  title="Clear all chats"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg hover:bg-white/20 text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-950">
              {isLoadingHistory ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                </div>
              ) : (
                messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 group ${
                      message.role === 'user' ? 'flex-row-reverse' : ''
                    }`}
                    onMouseEnter={() => setHoveredMessageId(message.id)}
                    onMouseLeave={() => setHoveredMessageId(null)}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        message.role === 'user'
                          ? 'bg-teal-600'
                          : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <User className="w-4 h-4 text-white" />
                      ) : (
                        <Bot className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      )}
                    </div>
                    <div className="relative max-w-[75%]">
                      <div
                        className={`p-3 rounded-2xl text-sm leading-relaxed ${
                          message.role === 'user'
                            ? 'bg-teal-600 text-white rounded-br-none'
                            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-none shadow-sm border border-gray-100 dark:border-gray-700'
                        }`}
                      >
                        <div className="whitespace-pre-line">
                          {message.role === 'assistant' ? renderMarkdown(message.content) : message.content}
                        </div>
                      </div>
                      {/* Delete button on hover */}
                      {hoveredMessageId === message.id && message.id !== 'welcome' && (
                        <button
                          onClick={() => handleDeleteMessage(message)}
                          className={`absolute -top-2 ${message.role === 'user' ? '-left-2' : '-right-2'} p-1 rounded-full bg-red-100 dark:bg-red-900/50 text-red-500 hover:bg-red-200 dark:hover:bg-red-800 transition-colors shadow-sm`}
                          title="Delete message"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
              
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl rounded-bl-none shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                      <span className="text-xs text-gray-500">Thinking...</span>
                    </div>
                  </div>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            <div className="px-4 py-2 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {roleConfig.quickActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => {
                      setInput(action.query);
                    }}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300 hover:bg-teal-100 dark:hover:bg-teal-900/30 hover:text-teal-700 dark:hover:text-teal-400 transition-colors whitespace-nowrap"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything..."
                  className="flex-1 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="p-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIChatbot;
