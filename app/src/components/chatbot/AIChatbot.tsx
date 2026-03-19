// ============================================
// AI CHATBOT COMPONENT
// ============================================

import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  X,
  Send,
  Bot,
  User,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getTasksByEmployee, getProjectsByEmployee } from '@/services/firestoreService';
import type { Task, Project } from '@/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const AIChatbot = () => {
  const { userData } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello ${userData?.name || 'there'}! I'm your AI assistant. I can help you with:\n\n• Check your pending tasks\n• View your project information\n• Guide you on submitting reports\n• Answer general questions about the system\n\nWhat would you like to know?`,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (userData?.uid) {
      loadUserData();
    }
  }, [userData]);

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

  const generateResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    // Task-related queries
    if (lowerMessage.includes('task') || lowerMessage.includes('work')) {
      const pendingTasks = tasks.filter(t => t.status === 'pending');
      const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
      
      if (pendingTasks.length === 0 && inProgressTasks.length === 0) {
        return "You don't have any pending tasks at the moment. Great job staying on top of your work!";
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
      if (projects.length === 0) {
        return "You don't have any assigned projects currently.";
      }
      
      let response = `You're working on **${projects.length} project(s)**: \n\n`;
      projects.slice(0, 3).forEach((project, i) => {
        response += `${i + 1}. **${project.name}** - ${project.progress}% complete\n`;
      });
      
      return response;
    }
    
    // Report submission queries
    if (lowerMessage.includes('report') || lowerMessage.includes('submit')) {
      return `To submit a report:\n\n1. Go to your **Dashboard**\n2. Click on **"Submit Work"** or **"Daily Update"** button\n3. Fill in your work details, hours, and accomplishments\n4. Click **Submit**\n\nYour supervisor will be notified automatically!`;
    }
    
    // Progress queries
    if (lowerMessage.includes('progress') || lowerMessage.includes('how am i doing')) {
      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      const totalTasks = tasks.length;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
      return `Your current progress:\n\n• **${completedTasks}** tasks completed out of **${totalTasks}**\n• Overall progress: **${progress}%**\n\n${progress >= 70 ? 'Excellent work! Keep it up! 🎉' : progress >= 40 ? 'Good progress! You\'re doing well! 👍' : 'Keep pushing! You\'ve got this! 💪'}`;
    }
    
    // Help queries
    if (lowerMessage.includes('help') || lowerMessage.includes('support')) {
      return `I can help you with:\n\n• **Tasks** - Check pending and in-progress tasks\n• **Projects** - View your assigned projects\n• **Reports** - Learn how to submit work reports\n• **Progress** - See your overall performance\n\nJust ask me anything!`;
    }
    
    // Greeting
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
      return `Hello ${userData?.name || 'there'}! 👋 How can I assist you today?`;
    }
    
    // Default response
    return `I'm not sure I understand. I can help you with:\n\n• Checking your tasks\n• Viewing your projects\n• Submitting reports\n• Tracking your progress\n\nWhat would you like to know?`;
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
    setInput('');
    setIsLoading(true);

    // Simulate AI processing delay
    setTimeout(() => {
      const response = generateResponse(userMessage.content);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 500 + Math.random() * 1000);
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickActions = [
    { label: 'My Tasks', query: 'What are my pending tasks?' },
    { label: 'My Projects', query: 'Show my projects' },
    { label: 'Submit Report', query: 'How do I submit a report?' },
    { label: 'My Progress', query: 'Show my progress' }
  ];

  return (
    <>
      {/* Chat Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full bg-gradient-to-r from-teal-600 to-teal-700 text-white shadow-lg hover:shadow-xl transition-shadow ${
          isOpen ? 'hidden' : 'flex'
        }`}
      >
        <MessageSquare className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
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
                    Online
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="h-96 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-950">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'flex-row-reverse' : ''
                  }`}
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
                  <div
                    className={`max-w-[75%] p-3 rounded-2xl text-sm ${
                      message.role === 'user'
                        ? 'bg-teal-600 text-white rounded-br-none'
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-none shadow-sm border border-gray-100 dark:border-gray-700'
                    }`}
                  >
                    <div className="whitespace-pre-line">{message.content}</div>
                  </div>
                </motion.div>
              ))}
              
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
                {quickActions.map((action) => (
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
