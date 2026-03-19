// ============================================
// FIRESTORE SERVICE - CRUD OPERATIONS (WITH CACHING)
// ============================================

import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/firebase/config';
import type { 
  User, Department, Project, Task, DailyWork, 
  Report, Notice, Notification, Team 
} from '@/types';

// ============================================
// IN-MEMORY CACHE (2-minute TTL)
// ============================================

const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// Invalidate cache entries that match a prefix (call after mutations)
function invalidateCache(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

// ============================================
// USERS
// ============================================

export const createUser = async (uid: string, userData: Omit<User, 'uid'>): Promise<void> => {
  await setDoc(doc(db, 'users', uid), {
    ...userData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  invalidateCache('users');
};

export const getAllUsers = async (): Promise<User[]> => {
  const cached = getCached<User[]>('users:all');
  if (cached) return cached;
  const querySnapshot = await getDocs(collection(db, 'users'));
  const result = querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }) as User);
  setCache('users:all', result);
  return result;
};

export const getUsersByRole = async (role: string): Promise<User[]> => {
  const q = query(collection(db, 'users'), where('role', '==', role));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }) as User);
};

export const getUsersByDepartment = async (department: string): Promise<User[]> => {
  const q = query(collection(db, 'users'), where('department', '==', department));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }) as User);
};

export const updateUser = async (uid: string, data: Partial<User>): Promise<void> => {
  await updateDoc(doc(db, 'users', uid), {
    ...data,
    updatedAt: serverTimestamp()
  });
  invalidateCache('users');
};

export const deleteUser = async (uid: string): Promise<void> => {
  await deleteDoc(doc(db, 'users', uid));
  invalidateCache('users');
};

// ============================================
// DEPARTMENTS
// ============================================

export const createDepartment = async (
  data: Omit<Department, 'id'>
): Promise<string> => {
  const docRef = await addDoc(collection(db, 'departments'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  invalidateCache('departments');
  return docRef.id;
};

export const getAllDepartments = async (): Promise<Department[]> => {
  const cached = getCached<Department[]>('departments:all');
  if (cached) return cached;
  const querySnapshot = await getDocs(collection(db, 'departments'));
  const result = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Department);
  setCache('departments:all', result);
  return result;
};

export const getDepartment = async (id: string): Promise<Department | null> => {
  const docSnap = await getDoc(doc(db, 'departments', id));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Department;
};

export const updateDepartment = async (
  id: string, 
  data: Partial<Department>
): Promise<void> => {
  await updateDoc(doc(db, 'departments', id), {
    ...data,
    updatedAt: serverTimestamp()
  });
  invalidateCache('departments');
};

export const deleteDepartment = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'departments', id));
  invalidateCache('departments');
};

// ============================================
// PROJECTS
// ============================================

export const createProject = async (
  data: Omit<Project, 'id'>
): Promise<string> => {
  const docRef = await addDoc(collection(db, 'projects'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  invalidateCache('projects');
  return docRef.id;
};

export const getAllProjects = async (): Promise<Project[]> => {
  const cached = getCached<Project[]>('projects:all');
  if (cached) return cached;
  const querySnapshot = await getDocs(collection(db, 'projects'));
  const result = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Project);
  setCache('projects:all', result);
  return result;
};

export const getProject = async (id: string): Promise<Project | null> => {
  const docSnap = await getDoc(doc(db, 'projects', id));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Project;
};

export const getProjectsByDepartment = async (departmentId: string): Promise<Project[]> => {
  const q = query(collection(db, 'projects'), where('departmentId', '==', departmentId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Project);
};

export const getProjectsByManager = async (managerId: string): Promise<Project[]> => {
  const q = query(collection(db, 'projects'), where('assignedManagerId', '==', managerId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Project);
};

export const getProjectsByEmployee = async (employeeId: string): Promise<Project[]> => {
  // First get projects where they are explicitly in teamMembers
  const qProjects = query(collection(db, 'projects'), where('teamMembers', 'array-contains', employeeId));
  const projectsSnapshot = await getDocs(qProjects);
  const projects = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Project);
  
  // Also get projects where they have assigned tasks (in case PM forgot to add to teamMembers)
  const qTasks = query(collection(db, 'tasks'), where('employeeId', '==', employeeId));
  const tasksSnapshot = await getDocs(qTasks);
  const tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Task);
  
  const existingProjectIds = new Set(projects.map(p => p.id));
  const missingProjectIds = [...new Set(tasks.map(t => t.projectId))].filter(id => !existingProjectIds.has(id));
  
  // Fetch missing projects individually (usually a very small number if any)
  for (const pId of missingProjectIds) {
    const pSnap = await getDoc(doc(db, 'projects', pId));
    if (pSnap.exists()) {
      projects.push({ id: pSnap.id, ...pSnap.data() } as Project);
    }
  }
  
  return projects;
};

export const updateProject = async (id: string, data: Partial<Project>): Promise<void> => {
  await updateDoc(doc(db, 'projects', id), {
    ...data,
    updatedAt: serverTimestamp()
  });
  invalidateCache('projects');
};

export const deleteProject = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'projects', id));
  invalidateCache('projects');
};

// ============================================
// TASKS
// ============================================

export const createTask = async (data: Omit<Task, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'tasks'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  invalidateCache('tasks');
  return docRef.id;
};

export const getAllTasks = async (): Promise<Task[]> => {
  const cached = getCached<Task[]>('tasks:all');
  if (cached) return cached;
  const querySnapshot = await getDocs(collection(db, 'tasks'));
  const result = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Task);
  setCache('tasks:all', result);
  return result;
};

export const getTask = async (id: string): Promise<Task | null> => {
  const docSnap = await getDoc(doc(db, 'tasks', id));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Task;
};

export const getTasksByProject = async (projectId: string): Promise<Task[]> => {
  const q = query(collection(db, 'tasks'), where('projectId', '==', projectId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Task);
};

export const getTasksByEmployee = async (employeeId: string): Promise<Task[]> => {
  const q = query(collection(db, 'tasks'), where('employeeId', '==', employeeId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Task);
};

export const getPendingTasksByEmployee = async (employeeId: string): Promise<Task[]> => {
  const q = query(collection(db, 'tasks'), where('employeeId', '==', employeeId));
  const querySnapshot = await getDocs(q);
  const tasks = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Task);
  return tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
};

export const updateTask = async (id: string, data: Partial<Task>): Promise<void> => {
  await updateDoc(doc(db, 'tasks', id), {
    ...data,
    updatedAt: serverTimestamp()
  });
  invalidateCache('tasks');
};

export const deleteTask = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'tasks', id));
  invalidateCache('tasks');
};

// ============================================
// DAILY WORK
// ============================================

export const submitDailyWork = async (
  data: Omit<DailyWork, 'id'>
): Promise<string> => {
  const docRef = await addDoc(collection(db, 'dailyWork'), {
    ...data,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const getAllDailyWork = async (): Promise<DailyWork[]> => {
  const q = query(collection(db, 'dailyWork'), orderBy('date', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as DailyWork);
};

export const deleteDailyWork = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'dailyWork', id));
};

export const getDailyWorkByEmployee = async (employeeId: string): Promise<DailyWork[]> => {
  const q = query(collection(db, 'dailyWork'), where('employeeId', '==', employeeId));
  const querySnapshot = await getDocs(q);
  const works = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as DailyWork);
  return works.sort((a, b) => {
    const dateA = a.date instanceof Date ? a.date.getTime() : new Date(a.date).getTime();
    const dateB = b.date instanceof Date ? b.date.getTime() : new Date(b.date).getTime();
    return dateB - dateA;
  });
};

export const getDailyWorkByDate = async (
  employeeId: string, 
  date: Date
): Promise<DailyWork[]> => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const q = query(collection(db, 'dailyWork'), where('employeeId', '==', employeeId));
  const querySnapshot = await getDocs(q);
  const works = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as DailyWork);
  
  return works.filter(w => {
    const wDate = w.date instanceof Date ? w.date.getTime() : new Date(w.date).getTime();
    return wDate >= startOfDay.getTime() && wDate <= endOfDay.getTime();
  });
};

// ============================================
// REPORTS
// ============================================

export const submitReport = async (
  data: Omit<Report, 'id'>,
  file?: File
): Promise<string> => {
  let fileURL = '';
  
  if (file) {
    const fileRef = ref(storage, `reports/${data.employeeId}/${file.name}`);
    await uploadBytes(fileRef, file);
    fileURL = await getDownloadURL(fileRef);
  }

  const docRef = await addDoc(collection(db, 'reports'), {
    ...data,
    fileURL,
    submittedAt: serverTimestamp()
  });
  return docRef.id;
};

export const getReportsByEmployee = async (employeeId: string): Promise<Report[]> => {
  const q = query(collection(db, 'reports'), where('employeeId', '==', employeeId));
  const querySnapshot = await getDocs(q);
  const reports = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Report);
  return reports.sort((a, b) => {
    const dateA = a.submittedAt instanceof Date ? a.submittedAt.getTime() : new Date(a.submittedAt).getTime();
    const dateB = b.submittedAt instanceof Date ? b.submittedAt.getTime() : new Date(b.submittedAt).getTime();
    return dateB - dateA;
  });
};

export const getReportsByType = async (type: string): Promise<Report[]> => {
  const q = query(collection(db, 'reports'), where('type', '==', type));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Report);
};

export const reviewReport = async (
  reportId: string, 
  reviewerId: string, 
  status: 'approved' | 'rejected',
  feedback?: string
): Promise<void> => {
  await updateDoc(doc(db, 'reports', reportId), {
    status,
    reviewedBy: reviewerId,
    reviewedAt: serverTimestamp(),
    feedback: feedback || ''
  });
};

// ============================================
// NOTICES
// ============================================

export const createNotice = async (
  data: Omit<Notice, 'id'>
): Promise<string> => {
  const docRef = await addDoc(collection(db, 'notices'), {
    ...data,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const getAllNotices = async (limit_count: number = 50): Promise<Notice[]> => {
  const q = query(
    collection(db, 'notices'), 
    orderBy('createdAt', 'desc'),
    limit(limit_count)
  );
  const querySnapshot = await getDocs(q);
  const allNotices = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Notice);
  return allNotices.filter(n => n.isActive !== false);
};

export const getNoticesByCategory = async (category: string): Promise<Notice[]> => {
  const q = query(collection(db, 'notices'), where('category', '==', category));
  const querySnapshot = await getDocs(q);
  let notices = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Notice);
  
  notices = notices.filter(n => n.isActive === true);
  return notices.sort((a, b) => {
    const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
    const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
    return dateB - dateA;
  });
};

export const updateNotice = async (id: string, data: Partial<Notice>): Promise<void> => {
  await updateDoc(doc(db, 'notices', id), data);
};

export const deleteNotice = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'notices', id));
};

// ============================================
// NOTIFICATIONS
// ============================================

export const createNotification = async (
  data: Omit<Notification, 'id'>
): Promise<string> => {
  const docRef = await addDoc(collection(db, 'notifications'), {
    ...data,
    read: false,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const getUserNotifications = async (userId: string): Promise<Notification[]> => {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Notification);
};

export const markNotificationRead = async (notificationId: string): Promise<void> => {
  await updateDoc(doc(db, 'notifications', notificationId), { read: true });
};

export const markAllNotificationsRead = async (userId: string): Promise<void> => {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    where('read', '==', false)
  );
  const querySnapshot = await getDocs(q);
  
  const batch = querySnapshot.docs.map(doc => 
    updateDoc(doc.ref, { read: true })
  );
  await Promise.all(batch);
};

// ============================================
// TEAMS
// ============================================

export const createTeam = async (data: Omit<Team, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'teams'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
};

export const getTeamsByDepartment = async (departmentId: string): Promise<Team[]> => {
  const q = query(collection(db, 'teams'), where('departmentId', '==', departmentId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Team);
};

export const getTeamsBySupervisor = async (supervisorId: string): Promise<Team[]> => {
  const q = query(collection(db, 'teams'), where('supervisorId', '==', supervisorId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Team);
};

export const updateTeam = async (id: string, data: Partial<Team>): Promise<void> => {
  await updateDoc(doc(db, 'teams', id), {
    ...data,
    updatedAt: serverTimestamp()
  });
};

export const deleteTeam = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'teams', id));
};

// ============================================
// ANALYTICS
// ============================================

export const getDashboardAnalytics = async () => {
  const cached = getCached<any>('analytics:dashboard');
  if (cached) return cached;

  const [users, departments, projects, tasks] = await Promise.all([
    getAllUsers(),
    getAllDepartments(),
    getAllProjects(),
    getAllTasks()
  ]);

  const totalEmployees = users.filter(u => 
    ['employee', 'intern', 'apprentice'].includes(u.role)
  ).length;

  const activeProjects = projects.filter(p => p.status === 'active').length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  
  const pendingTasks = tasks.filter(t => 
    ['pending', 'in_progress'].includes(t.status)
  ).length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;

  const result = {
    totalEmployees,
    totalDepartments: departments.length,
    totalProjects: projects.length,
    activeProjects,
    completedProjects,
    pendingTasks,
    completedTasks
  };

  setCache('analytics:dashboard', result);
  return result;
};
