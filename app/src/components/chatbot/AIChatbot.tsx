// ============================================
// AI CHATBOT COMPONENT (Multi-Role + Persistent)
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
    greeting: `I can help you with:\n\n• System user management\n• Analytics & metrics overview\n• Department management\n• Notice management\n\nWhat would you like to know?`,
    quickActions: [
      { label: 'System Stats', query: 'Show system analytics' },
      { label: 'User Count', query: 'How many users are there?' },
      { label: 'Active Projects', query: 'Show active projects' },
      { label: 'Pending Approvals', query: 'Any pending approvals?' }
    ]
  },
  hr: {
    greeting: `I can help you with:\n\n• Employee verification status\n• Workforce analytics\n• Pending approvals\n• Employee data queries\n\nWhat would you like to know?`,
    quickActions: [
      { label: 'Pending Approvals', query: 'Show pending user approvals' },
      { label: 'Employee Count', query: 'How many employees?' },
      { label: 'Department Stats', query: 'Show department breakdown' },
      { label: 'Help', query: 'What can you do?' }
    ]
  },
  general_manager: {
    greeting: `I can help you with:\n\n• High-level project analytics\n• Department performance\n• Workforce overview\n• Strategic insights\n\nWhat would you like to know?`,
    quickActions: [
      { label: 'Overview', query: 'Show overall analytics' },
      { label: 'Departments', query: 'Department performance' },
      { label: 'Projects', query: 'Active project status' },
      { label: 'Workforce', query: 'Show workforce stats' }
    ]
  },
  project_manager: {
    greeting: `I can help you with:\n\n• Team status & performance\n• Project progress tracking\n• Task management insights\n• Work submission reviews\n\nWhat would you like to know?`,
    quickActions: [
      { label: 'My Projects', query: 'Show my projects' },
      { label: 'Team Status', query: 'How is my team doing?' },
      { label: 'Pending Tasks', query: 'Show pending tasks' },
      { label: 'Progress', query: 'Overall project progress' }
    ]
  },
  supervisor: {
    greeting: `I can help you with:\n\n• Team member status\n• Work tracking overview\n• Task assignments\n• Team performance\n\nWhat would you like to know?`,
    quickActions: [
      { label: 'Team Status', query: 'Show team members status' },
      { label: 'Work Log', query: 'Recent work submissions' },
      { label: 'Tasks', query: 'Pending team tasks' },
      { label: 'Help', query: 'What can you do?' }
    ]
  },
  employee: {
    greeting: `I can help you with:\n\n• Check your pending tasks\n• View your project information\n• Guide you on submitting reports\n• Answer general questions\n\nWhat would you like to know?`,
    quickActions: [
      { label: 'My Tasks', query: 'What are my pending tasks?' },
      { label: 'My Projects', query: 'Show my projects' },
      { label: 'Submit Report', query: 'How do I submit a report?' },
      { label: 'My Progress', query: 'Show my progress' }
    ]
  },
  intern: {
    greeting: `I can help you with:\n\n• Check assigned tasks\n• Track your learning progress\n• Submit daily updates\n• General guidance\n\nWhat would you like to know?`,
    quickActions: [
      { label: 'My Tasks', query: 'Show my tasks' },
      { label: 'Progress', query: 'Show my progress' },
      { label: 'Submit Update', query: 'How to submit daily update?' },
      { label: 'Help', query: 'What can I do?' }
    ]
  },
  apprentice: {
    greeting: `I can help you with:\n\n• Check assigned tasks\n• Track your learning progress\n• Submit daily updates\n• General guidance\n\nWhat would you like to know?`,
    quickActions: [
      { label: 'My Tasks', query: 'Show my tasks' },
      { label: 'Progress', query: 'Show my progress' },
      { label: 'Submit Update', query: 'How to submit daily update?' },
      { label: 'Help', query: 'What can I do?' }
    ]
  }
};

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
          content: `Hello ${userData?.name || 'there'}! ${roleConfig.greeting}`,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      // Fallback welcome message
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `Hello ${userData?.name || 'there'}! ${roleConfig.greeting}`,
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
  // ROLE-AWARE RESPONSE GENERATION
  // ============================================
  const generateResponse = async (userMessage: string): Promise<string> => {
    const lowerMessage = userMessage.toLowerCase();

    // --- Manager/GM/Admin: analytics & high-level queries ---
    if (['admin', 'general_manager', 'hr'].includes(userRole)) {
      if (lowerMessage.includes('analytics') || lowerMessage.includes('stats') || lowerMessage.includes('overview')) {
        try {
          const analytics = await getDashboardAnalytics();
          return `**System Analytics:**\n\n• **${analytics.totalEmployees}** employees\n• **${analytics.totalDepartments}** departments\n• **${analytics.totalProjects}** total projects (${analytics.activeProjects} active)\n• **${analytics.pendingTasks}** pending tasks\n• **${analytics.completedTasks}** completed tasks`;
        } catch {
          return 'Unable to load analytics at this time. Please try again later.';
        }
      }

      if (lowerMessage.includes('user') && (lowerMessage.includes('count') || lowerMessage.includes('how many'))) {
        try {
          const users = await getAllUsers();
          const byRole = users.reduce((acc: Record<string, number>, u) => {
            acc[u.role] = (acc[u.role] || 0) + 1;
            return acc;
          }, {});
          let response = `**Total Users:** ${users.length}\n\n`;
          Object.entries(byRole).forEach(([role, count]) => {
            response += `• ${role.replace('_', ' ')}: **${count}**\n`;
          });
          return response;
        } catch {
          return 'Unable to load user data at this time.';
        }
      }

      if (lowerMessage.includes('pending') && lowerMessage.includes('approval')) {
        try {
          const users = await getAllUsers();
          const pending = users.filter(u => 
            u.approvalStatus === 'pending' || (!u.approvalStatus && u.isApproved === false)
          );
          if (pending.length === 0) return 'No pending approvals! All users have been reviewed. ✅';
          let response = `**${pending.length} Pending Approval(s):**\n\n`;
          pending.slice(0, 5).forEach((u, i) => {
            response += `${i + 1}. **${u.name}** — ${u.email} (${u.role})\n`;
          });
          if (pending.length > 5) response += `\n...and ${pending.length - 5} more`;
          return response;
        } catch {
          return 'Unable to check pending approvals at this time.';
        }
      }
    }

    // --- PM/Supervisor: team & project management ---
    if (['project_manager', 'supervisor'].includes(userRole)) {
      if (lowerMessage.includes('team') && (lowerMessage.includes('status') || lowerMessage.includes('doing'))) {
        try {
          const allProjects = await getAllProjects();
          const myProjects = allProjects.filter(p => p.assignedManagerId === userData?.uid);
          if (myProjects.length === 0) return "You don't have any assigned projects yet.";
          let response = `**Your Team's Projects:**\n\n`;
          myProjects.forEach((p, i) => {
            response += `${i + 1}. **${p.name}** — ${p.progress}% complete (${p.status})\n`;
          });
          return response;
        } catch {
          return 'Unable to load team data at this time.';
        }
      }
    }

    // --- Employee/Intern/Apprentice: task & progress queries ---
    // Task-related queries
    if (lowerMessage.includes('task') || lowerMessage.includes('work')) {
      const pendingTasks = tasks.filter(t => t.status === 'pending');
      const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
      
      if (pendingTasks.length === 0 && inProgressTasks.length === 0) {
        return "You don't have any pending tasks at the moment. Great job staying on top of your work! 🎉";
      }
      
      let response = `You have **${pendingTasks.length} pending** and **${inProgressTasks.length} in-progress** tasks.\n\n`;
      
      if (pendingTasks.length > 0) {
        response += "**Pending Tasks:**\n";
        pendingTasks.slice(0, 3).forEach((task, i) => {
          response += `${i + 1}. ${task.title}\n`;
        });
      }
      
      if (inProgressTasks.length > 0) {
        response += "\n**In Progress:**\n";
        inProgressTasks.slice(0, 3).forEach((task, i) => {
          response += `${i + 1}. ${task.title} (${task.progress}%)\n`;
        });
      }
      
      return response;
    }
    
    // Project-related queries
    if (lowerMessage.includes('project')) {
      if (['admin', 'general_manager'].includes(userRole)) {
        try {
          const allP = await getAllProjects();
          const active = allP.filter(p => p.status === 'active');
          let response = `**${allP.length} Total Projects** (${active.length} active):\n\n`;
          active.slice(0, 5).forEach((p, i) => {
            response += `${i + 1}. **${p.name}** — ${p.progress}% (${p.priority})\n`;
          });
          return response;
        } catch {
          return 'Unable to load project data.';
        }
      }

      if (projects.length === 0) {
        return "You don't have any assigned projects currently.";
      }
      let response = `You're working on **${projects.length} project(s)**: \n\n`;
      projects.slice(0, 3).forEach((project, i) => {
        response += `${i + 1}. **${project.name}** - ${project.progress}% complete\n`;
      });
      return response;
    }
    
    // Report queries
    if (lowerMessage.includes('report') || lowerMessage.includes('submit')) {
      if (userRole === 'intern' || userRole === 'apprentice') {
        return `To submit a daily update:\n\n1. Go to your **Dashboard**\n2. Click **"Daily Updates"** in the sidebar\n3. Fill in what you learned and accomplished\n4. Click **Submit**\n\nYour supervisor will review your updates!`;
      }
      return `To submit a report:\n\n1. Go to your **Dashboard**\n2. Click on **"Submit Work"** or **"Daily Update"**\n3. Fill in your work details, hours, and accomplishments\n4. Click **Submit**\n\nYour supervisor will be notified automatically!`;
    }
    
    // Progress queries
    if (lowerMessage.includes('progress') || lowerMessage.includes('how am i doing')) {
      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      const totalTasks = tasks.length;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
      return `Your current progress:\n\n• **${completedTasks}** tasks completed out of **${totalTasks}**\n• Overall progress: **${progress}%**\n\n${progress >= 70 ? 'Excellent work! Keep it up! 🎉' : progress >= 40 ? 'Good progress! You\'re doing well! 👍' : 'Keep pushing! You\'ve got this! 💪'}`;
    }
    
    // Help queries
    if (lowerMessage.includes('help') || lowerMessage.includes('support') || lowerMessage.includes('what can')) {
      return `I can help you with:\n\n• **Tasks** — Check pending and in-progress tasks\n• **Projects** — View your assigned projects\n• **Reports** — Learn how to submit work reports\n• **Progress** — See your overall performance\n${['admin', 'hr', 'general_manager'].includes(userRole) ? '• **Analytics** — System-wide statistics\n• **Users** — User counts and approval status\n' : ''}\nJust ask me anything!`;
    }
    
    // Greeting
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
      return `Hello ${userData?.name || 'there'}! 👋 How can I assist you today?`;
    }
    
    // Default
    return `I'm not sure I understand. ${roleConfig.quickActions.length > 0 ? 'Try one of the quick actions below, or ' : ''}ask me about your tasks, projects, reports, or progress!`;
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
        content: `Chat cleared! ${roleConfig.greeting}`,
        timestamp: new Date()
      }]);
    } catch (err) {
      console.error('Failed to clear chat:', err);
    }
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
                  <h3 className="font-semibold text-white">AI Assistant</h3>
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
                        className={`p-3 rounded-2xl text-sm ${
                          message.role === 'user'
                            ? 'bg-teal-600 text-white rounded-br-none'
                            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-none shadow-sm border border-gray-100 dark:border-gray-700'
                        }`}
                      >
                        <div className="whitespace-pre-line">{message.content}</div>
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
                    <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                  </div>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            <div className="px-4 py-2 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {roleConfig.quickActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => {
                      setInput(action.query);
                    }}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-300 hover:bg-teal-100 dark:hover:bg-teal-900/30 hover:text-teal-700 dark:hover:text-teal-400 transition-colors"
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
                  placeholder="Type your message..."
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
