// ============================================
// UTILITY FUNCTIONS
// ============================================

import { Timestamp } from 'firebase/firestore';

// Format date
export const formatDate = (date: Date | Timestamp | string, format: string = 'short'): string => {
  const d = date instanceof Timestamp ? date.toDate() : new Date(date);
  
  if (format === 'short') {
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
  
  if (format === 'long') {
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  }
  
  if (format === 'time') {
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  if (format === 'datetime') {
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  return d.toISOString();
};

// Format relative time (e.g., "2 hours ago")
export const formatRelativeTime = (date: Date | Timestamp | string): string => {
  const d = date instanceof Timestamp ? date.toDate() : new Date(date);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
  }

  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`;
};

// Format number with commas
export const formatNumber = (num: number): string => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// Format percentage
export const formatPercentage = (value: number, decimals: number = 0): string => {
  return `${value.toFixed(decimals)}%`;
};

// Get initials from name
export const getInitials = (name: string): string => {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(n => n.length > 0)
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Generate random color for avatar
export const getAvatarColor = (name: string): string => {
  if (!name) return 'bg-gray-500';
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
    'bg-rose-500'
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

// Truncate text
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

// Capitalize first letter
export const capitalize = (str: string): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Format role name for display
export const formatRole = (role: string): string => {
  if (!role) return 'Unknown Role';
  return role
    .split('_')
    .filter(Boolean)
    .map(word => capitalize(word))
    .join(' ');
};

// Validate email
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate password strength
export const getPasswordStrength = (password: string): {
  score: number;
  label: string;
  color: string;
} => {
  let score = 0;
  
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const strengthMap: { [key: number]: { label: string; color: string } } = {
    0: { label: 'Very Weak', color: 'bg-red-500' },
    1: { label: 'Weak', color: 'bg-orange-500' },
    2: { label: 'Fair', color: 'bg-yellow-500' },
    3: { label: 'Good', color: 'bg-blue-500' },
    4: { label: 'Strong', color: 'bg-green-500' },
    5: { label: 'Very Strong', color: 'bg-emerald-500' },
    6: { label: 'Excellent', color: 'bg-teal-500' }
  };

  return {
    score,
    ...strengthMap[Math.min(score, 6)]
  };
};

// Debounce function
export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Group array by key
export const groupBy = <T>(array: T[], key: keyof T): { [key: string]: T[] } => {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    result[groupKey] = result[groupKey] || [];
    result[groupKey].push(item);
    return result;
  }, {} as { [key: string]: T[] });
};

// Sort array by key
export const sortBy = <T>(
  array: T[],
  key: keyof T,
  order: 'asc' | 'desc' = 'asc'
): T[] => {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });
};

// Filter array by search term
export const filterBySearch = <T>(
  array: T[],
  keys: (keyof T)[],
  searchTerm: string
): T[] => {
  const lowerSearch = searchTerm.toLowerCase();
  
  return array.filter(item =>
    keys.some(key =>
      String(item[key]).toLowerCase().includes(lowerSearch)
    )
  );
};

// Calculate progress percentage
export const calculateProgress = (completed: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
};

// Get status color
export const getStatusColor = (status: string): string => {
  const statusColors: { [key: string]: string } = {
    pending: 'bg-yellow-500',
    in_progress: 'bg-blue-500',
    review: 'bg-purple-500',
    completed: 'bg-green-500',
    cancelled: 'bg-red-500',
    active: 'bg-green-500',
    on_hold: 'bg-orange-500',
    planning: 'bg-gray-500',
    approved: 'bg-green-500',
    rejected: 'bg-red-500',
    urgent: 'bg-red-600',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-blue-500'
  };
  
  return statusColors[status.toLowerCase()] || 'bg-gray-500';
};

// Generate unique ID
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
};

// Deep clone object
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

// Check if object is empty
export const isEmptyObject = (obj: object): boolean => {
  return Object.keys(obj).length === 0;
};

// Convert file to base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

// Get file extension
export const getFileExtension = (filename: string): string => {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
};

// Format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
